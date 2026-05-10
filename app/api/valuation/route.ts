import { createChatCompletion } from "../../../lib/ai/groq";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";
import { buildPartMarketContext, formatMarketContext } from "../../../lib/market-intel";

type ValuationRequest = {
  purpose: string;
  components: string;
  conditionNote: string;
  usageYears: number;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<ValuationRequest>;

    const purpose = body.purpose?.trim();
    const components = body.components?.trim();
    const conditionNote = body.conditionNote?.trim() ?? "";
    const usageYears = Number(body.usageYears);

    if (!purpose || !components || Number.isNaN(usageYears)) {
      return Response.json(
        { error: "purpose, components, usageYears are required" },
        { status: 400 }
      );
    }

    const marketContext = await buildPartMarketContext({
      query: `${purpose} ${components} ${conditionNote} ${usageYears}`,
    });

    const result = await createChatCompletion([
      {
        role: "system",
        content:
          "너는 한국 중고 PC 시세 분석가다. 한국어로 답하고 근거를 간결하게 제시한다. 실제 시장 데이터를 우선 참고하고 JSON만 출력한다.",
      },
      {
        role: "user",
        content: `아래 정보를 기준으로 중고 판매 적정가를 JSON으로 작성해줘.
용도: ${purpose}
구성: ${components}
상태 메모: ${conditionNote || "없음"}
사용 연수: ${usageYears}년

실제 시장 데이터 요약:
${formatMarketContext(marketContext as never)}

스키마: {"suggested_price": string, "price_range": string, "confidence": string, "reasoning": string[], "selling_tips": string[]}`,
      },
    ]);

    const supabase = createSupabaseAdminClient();

    if (supabase) {
      const { error: dbError } = await supabase.from("valuations").insert({
        purpose,
        components,
        condition_note: conditionNote,
        usage_years: usageYears,
        result,
      });
      if (dbError) {
        console.error("❌ Supabase insert error:", dbError);
      }
    } else {
      console.warn("⚠️ Supabase admin client not initialized");
    }

    return Response.json({ result, marketContext });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
