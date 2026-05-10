import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type MarketListing = {
  title: string;
  category: string;
  purpose: string;
  partType?: string;
  cpu?: string;
  gpu?: string;
  ram?: string;
  storage?: string;
  price: number;
  condition?: string;
  source?: string;
  sourceSite?: string;
  url?: string;
  scrapedAt?: string;
};

export type PartListing = {
  title: string;
  partType: "cpu" | "gpu" | "ram" | "ssd" | "motherboard" | "psu" | "cooler";
  category: string;
  purpose: string;
  price: number;
  source?: string;
  sourceSite?: string;
  url?: string;
  scrapedAt?: string;
};

export type MarketContext = {
  listings: MarketListing[];
  priceSummary: {
    min: number | null;
    max: number | null;
    average: number | null;
    count: number;
  };
};

async function loadMarketListings(): Promise<MarketListing[]> {
  try {
    const { data, error } = await supabase
      .from("market_listings")
      .select("*")
      .order("price", { ascending: false });

    if (error) {
      console.error("Error loading market listings:", error);
      return [];
    }

    return (data ?? []).map((item: Record<string, unknown>) => ({
      title: item.title as string,
      category: item.category as string,
      purpose: item.purpose as string,
      cpu: item.cpu as string | undefined,
      gpu: item.gpu as string | undefined,
      ram: item.ram as string | undefined,
      storage: item.storage as string | undefined,
      price: item.price as number,
      condition: item.condition as string | undefined,
      source: item.source as string | undefined,
      scrapedAt: item.scraped_at as string | undefined,
    }));
  } catch (error) {
    console.error("Error in loadMarketListings:", error);
    return [];
  }
}

function summarizePrices(listings: MarketListing[]) {
  if (!listings.length) {
    return {
      min: null,
      max: null,
      average: null,
      count: 0,
    };
  }

  const prices = listings.map((item) => item.price);
  const total = prices.reduce((sum, price) => sum + price, 0);

  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
    average: Math.round(total / prices.length),
    count: listings.length,
  };
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, "");
}

function scoreListing(listing: MarketListing, query: string) {
  const target = normalizeText(
    `${listing.title} ${listing.category} ${listing.purpose} ${listing.cpu ?? ""} ${listing.gpu ?? ""} ${listing.condition ?? ""}`
  );
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return 0;
  }

  let score = 0;

  for (const token of normalizedQuery.split(/[^a-z0-9가-힣]+/i).filter(Boolean)) {
    if (target.includes(token)) {
      score += 2;
    }
  }

  return score;
}

function pickRelevantListings(listings: MarketListing[], query: string) {
  return [...listings]
    .map((listing) => ({
      listing,
      score: scoreListing(listing, query),
    }))
    .sort((left, right) => right.score - left.score || right.listing.price - left.listing.price)
    .slice(0, 5)
    .map((item) => item.listing);
}

export async function buildMarketContext(input: {
  purpose: string;
  query: string;
  budget?: number;
}): Promise<MarketContext> {
  const allListings = await loadMarketListings();
  const relevantListings = pickRelevantListings(allListings.filter((listing) => listing.purpose === input.purpose), input.query);
  const budget = input.budget;
  const filteredListings = typeof budget === "number"
    ? relevantListings.filter((listing) => listing.price <= budget * 1.2)
    : relevantListings;

  return {
    listings: filteredListings,
    priceSummary: summarizePrices(filteredListings),
  };
}

export function formatMarketContext(context: MarketContext) {
  const listingLines = context.listings.length
    ? context.listings
        .map((listing) => {
          return [
            `- ${listing.title}`,
            `  price: ${listing.price}`,
            `  category: ${listing.category}`,
            `  purpose: ${listing.purpose}`,
            listing.cpu ? `  cpu: ${listing.cpu}` : null,
            listing.gpu ? `  gpu: ${listing.gpu}` : null,
            listing.ram ? `  ram: ${listing.ram}` : null,
            listing.storage ? `  storage: ${listing.storage}` : null,
            listing.condition ? `  condition: ${listing.condition}` : null,
            listing.source ? `  source: ${listing.source}` : null,
          ]
            .filter(Boolean)
            .join("\n");
        })
        .join("\n\n")
    : "- no local market data found";

  return `시장 데이터 요약\ncount: ${context.priceSummary.count}\nmin: ${context.priceSummary.min ?? "n/a"}\nmax: ${context.priceSummary.max ?? "n/a"}\naverage: ${context.priceSummary.average ?? "n/a"}\n\n관련 매물\n${listingLines}`;
}

async function loadPartListings(): Promise<PartListing[]> {
  try {
    const { data, error } = await supabase
      .from("part_listings")
      .select("*")
      .order("price", { ascending: false });

    if (error) {
      console.error("Error loading part listings:", error);
      return [];
    }

    return (data ?? []).map((item: Record<string, unknown>) => ({
      title: item.title as string,
      partType: item.part_type as PartListing["partType"],
      category: item.category as string,
      purpose: item.purpose as string,
      price: item.price as number,
      source: item.source as string | undefined,
      sourceSite: item.source_site as string | undefined,
      scrapedAt: item.scraped_at as string | undefined,
    }));
  } catch (error) {
    console.error("Error in loadPartListings:", error);
    return [];
  }
}

export async function buildPartMarketContext(input: {
  query: string;
}): Promise<{
  listings: PartListing[];
  priceSummary: {
    min: number | null;
    max: number | null;
    average: number | null;
    count: number;
  };
}> {
  const allListings = await loadPartListings();
  const query = input.query.toLowerCase();

  const partType = query.includes("cpu") || query.includes("프로세서")
    ? "cpu"
    : query.includes("gpu") || query.includes("그래픽") || query.includes("글카")
      ? "gpu"
      : query.includes("ram") || query.includes("메모리")
        ? "ram"
        : query.includes("ssd") || query.includes("저장") || query.includes("디스크")
          ? "ssd"
          : query.includes("메인보드") || query.includes("motherboard") || query.includes("보드")
            ? "motherboard"
            : query.includes("파워") || query.includes("psu") || query.includes("power")
              ? "psu"
              : query.includes("쿨러") || query.includes("cooler") || query.includes("수랭") || query.includes("공랭")
                ? "cooler"
          : null;

  const relevantListings = partType
    ? allListings.filter((listing) => listing.partType === partType)
    : allListings;

  const scored = [...relevantListings]
    .map((listing) => ({
      listing,
      score: scoreListing(
        {
          title: listing.title,
          category: listing.category,
          purpose: listing.purpose,
          price: listing.price,
          partType: listing.partType,
        },
        query
      ),
    }))
    .sort((left, right) => right.score - left.score || right.listing.price - left.listing.price)
    .slice(0, 5)
    .map((item) => item.listing);

  return {
    listings: scored,
    priceSummary: summarizePrices(scored),
  };
}