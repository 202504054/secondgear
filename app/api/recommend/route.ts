import { createSupabaseAdminClient } from "../../../lib/supabase/admin";
import { createChatCompletion } from "../../../lib/ai/groq";
import { buildMarketContext, formatMarketContext, buildPartMarketContext } from "../../../lib/market-intel";

type RecommendationRequest = {
  budget: number;
  category: string;
  requirements?: string;
};

type RecommendationResult = {
  summary: string;
  build: {
    cpu: string;
    gpu: string;
    ram: string;
    storage: string;
  };
  expected_price: string;
  why: string[];
  checklist: string[];
};

function extractJsonContent(content: string) {
  const fencedMatch = content.match(/```json\s*([\s\S]*?)```/i);

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = content.indexOf("{");
  const lastBrace = content.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return content.slice(firstBrace, lastBrace + 1).trim();
  }

  return content.trim();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<RecommendationRequest>;

    const budget = Number(body.budget);
    const category = body.category?.trim();
    const requirements = body.requirements?.trim() ?? "";

    if (!budget || !category) {
      return Response.json(
        { error: "budget and category are required" },
        { status: 400 }
      );
    }

    const marketContext = await buildMarketContext({
      purpose: "recommendation",
      query: `${category} ${requirements}`,
      budget,
    });

    const resultText = await createChatCompletion([
      {
        role: "system",
        content:
          "너는 한국의 중고 PC 구매 컨설턴트다. 사용자의 예산과 요구사항, 그리고 실제 시장 데이터를 반영해 과하거나 부족하지 않은 현실적인 사양을 추천한다. 반드시 한국어로, JSON만 출력한다.",
      },
      {
        role: "user",
        content: `아래 사용자 요구를 바탕으로 중고 PC 추천안을 JSON으로 작성해줘.
예산: ${budget}원
용도: ${category}
추가 요구사항: ${requirements || "없음"}

실제 시장 데이터 요약:
${formatMarketContext(marketContext)}

반드시 아래 스키마를 지켜줘.
{
  "summary": string,
  "build": {
    "cpu": string,
    "gpu": string,
    "ram": string,
    "storage": string
  },
  "expected_price": string,
  "why": string[],
  "checklist": string[]
}`,
      },
    ]);
    const cleanedResult = extractJsonContent(resultText);
    let parsedResult: RecommendationResult | null = null;

    try {
      parsedResult = JSON.parse(cleanedResult) as RecommendationResult;
    } catch {
      parsedResult = null;
    }

    const supabase = createSupabaseAdminClient();

    if (supabase) {
      const { error: dbError } = await supabase.from("recommendations").insert({
        budget,
        category,
        result: parsedResult ? JSON.stringify(parsedResult) : resultText,
      });
      if (dbError) {
        console.error("❌ Supabase insert error:", dbError);
      }
    } else {
      console.warn("⚠️ Supabase admin client not initialized");
    }

    // If we have a parsed JSON result, enrich it with per-part price summaries
    if (parsedResult) {
      try {
        const cpuCtx = await buildPartMarketContext({ query: parsedResult.build.cpu });
        const gpuCtx = await buildPartMarketContext({ query: parsedResult.build.gpu });
        const ramCtx = await buildPartMarketContext({ query: parsedResult.build.ram });
        const storageCtx = await buildPartMarketContext({ query: parsedResult.build.storage });

        // attach average prices (or null) to the result
        (parsedResult as any).build_prices = {
          cpu: cpuCtx.priceSummary.average,
          gpu: gpuCtx.priceSummary.average,
          ram: ramCtx.priceSummary.average,
          storage: storageCtx.priceSummary.average,
        };
      } catch (err) {
        console.warn("Could not enrich result with part prices:", err);
      }
    }

    return Response.json({
      result: parsedResult ?? resultText,
      raw: resultText,
      marketContext,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error("🔥🔥 에러 발생:", error);

    return Response.json(
      { error: message },
      { status: 500 }
    );
  }
}
