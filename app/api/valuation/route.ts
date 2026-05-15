import { createChatCompletion } from "../../../lib/ai/groq";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";
import { buildPartMarketContext, formatMarketContext, type PartListing } from "../../../lib/market-intel";
import * as cheerio from "cheerio";
import sources from "../../../scripts/crawl-sources.mjs";

type ValuationRequest = {
  purpose: string;
  components: string;
  conditionNote: string;
  usageYears: number;
};

type CrawlSource = {
  name: string;
  url: string;
  itemSelector: string;
  keywords?: string[];
};

function normalizeText(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizePrice(value: unknown) {
  if (!value) {
    return null;
  }

  const text = String(value);
  const matched = text.match(/([0-9][0-9,]*)\s*원/);

  if (!matched?.[1]) {
    return null;
  }

  return Number(matched[1].replace(/,/g, ""));
}

function resolveUrl(baseUrl: string, href: string | undefined) {
  if (!href) {
    return undefined;
  }

  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return undefined;
  }
}

async function fetchHtml(url: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildSearchUrl(source: CrawlSource, query: string) {
  if (source.url.includes("q=")) {
    return source.url.replace(/([?&]q=)[^&]*/i, `$1${encodeURIComponent(query)}`);
  }

  return source.url;
}

function extractListing($: cheerio.CheerioAPI, element: any, source: CrawlSource): PartListing | null {
  const rawText = normalizeText($(element).text());
  const price = normalizePrice(rawText);

  if (!rawText || price == null) {
    return null;
  }

  const linkTarget = $(element).find("a").first().attr("href");
  const cleanedText = rawText
    .replace(/찜하기/g, "")
    .replace(/무료배송/g, "")
    .replace(/-?\d+\s*(초|분|시간|일|주) 전/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const title = cleanedText
    .replace(/([0-9][0-9,]*)\s*원/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!title) {
    return null;
  }

  return {
    title,
    purpose: "valuation",
    partType: source.name.split("-").pop() as PartListing["partType"],
    category: source.name.split("-").pop() ?? "",
    price,
    source: source.name,
    sourceSite: source.name.startsWith("joongna")
      ? "joongna"
      : source.name.startsWith("bunjang")
        ? "bunjang"
        : "danawa",
    url: resolveUrl(source.url, linkTarget),
    scrapedAt: new Date().toISOString(),
  };
}

function isQueryRelevant(source: CrawlSource, query: string) {
  const normalizedQuery = query.toLowerCase();

  if (!source.keywords?.length) {
    return true;
  }

  return source.keywords.some((keyword) => normalizedQuery.includes(String(keyword).toLowerCase()));
}

function dedupeListings(listings: PartListing[]) {
  const seen = new Set<string>();
  return listings.filter((item) => {
    const key = `${item.title}|${item.price}|${item.source}`.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

async function crawlRelevantPartListings(query: string) {
  const searchSources = sources.filter((source) => isQueryRelevant(source as CrawlSource, query));
  const targetSources = searchSources.length ? searchSources : sources;

  const listings: PartListing[] = [];

  for (const source of targetSources) {
    try {
      const sourceUrl = buildSearchUrl(source as CrawlSource, query);
      const html = await fetchHtml(sourceUrl);
      const $ = cheerio.load(html);

      $(source.itemSelector).each((_, element) => {
        const listing = extractListing($, element, source as CrawlSource);
        if (listing) {
          listings.push(listing);
        }
      });
    } catch (error) {
      console.error(`❌ Crawling ${source.name} failed:`, error instanceof Error ? error.message : String(error));
    }
  }

  const merged = dedupeListings(listings);
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    console.warn("⚠️ Supabase admin client not initialized for query crawl");
    return merged;
  }

  const { data: existing, error: fetchError } = await supabase
    .from("part_listings")
    .select("title,price,source");

  if (fetchError) {
    console.error("❌ Failed to load existing part listings:", fetchError);
  }

  const existingKeySet = new Set(
    (existing ?? []).map((item) => `${String(item.title)}|${Number(item.price)}|${String(item.source)}`.toLowerCase())
  );

  const toInsert = merged.filter((item) => !existingKeySet.has(`${item.title}|${item.price}|${item.source}`.toLowerCase()));

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from("part_listings").insert(
      toInsert.map((item) => ({
        title: item.title,
        purpose: item.purpose,
        part_type: item.partType,
        category: item.category,
        price: item.price,
        source: item.source,
        source_site: item.sourceSite,
        url: item.url,
        scraped_at: item.scrapedAt,
      }))
    );

    if (insertError) {
      console.error("❌ Error inserting crawled part listings:", insertError);
    }
  }

  return merged;
}

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

    const query = `${purpose} ${components} ${conditionNote} ${usageYears}`;

    try {
      await crawlRelevantPartListings(query);
    } catch (crawlError) {
      console.error("⚠️ Query crawl failed:", crawlError instanceof Error ? crawlError.message : String(crawlError));
    }

    const marketContext = await buildPartMarketContext({
      query,
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
