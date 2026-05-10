import fs from "fs/promises";
import path from "path";
import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";

import sources from "./crawl-sources.mjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const GLOBAL_BLOCKED_KEYWORDS = [
  "파워레인저",
  "체인소맨",
  "키라키라",
  "메탈엽서",
  "엽서",
  "굿즈",
  "피규어",
  "넨도로이드",
  "아크릴",
  "포스터",
  "포토카드",
  "갤럭시",
  "아이폰",
  "아이패드",
  "휴대폰",
  "스마트폰",
  "태블릿",
  "보조배터리",
  "파워뱅크",
  "월광보합",
  "게임기",
  "닌텐도",
  "플스",
  "ps5",
  "xbox",
  "서브폰",
  "무선랜카드",
  "수리기기",
];
const COMPUTER_CONTEXT_KEYWORDS = [
  "컴퓨터",
  "pc",
  "데스크탑",
  "본체",
  "cpu",
  "gpu",
  "그래픽카드",
  "그래픽 카드",
  "메인보드",
  "마더보드",
  "ram",
  "메모리",
  "ssd",
  "nvme",
  "m.2",
  "ddr4",
  "ddr5",
  "파워서플라이",
  "power supply",
  "psu",
  "쿨러",
  "수랭",
  "공랭",
  "시스템쿨러",
  "노트북",
  "게이밍",
  "서버",
  "워크스테이션",
  "atx",
  "sfx",
];

function normalizePrice(value) {
  if (!value) {
    return null;
  }

  const text = String(value);
  const matchedPrice = text.match(/([0-9][0-9,]*)\s*원/);

  if (!matchedPrice?.[1]) {
    return null;
  }

  return Number(matchedPrice[1].replace(/,/g, ""));
}

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function resolveUrl(baseUrl, href) {
  if (!href) {
    return undefined;
  }

  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return undefined;
  }
}

async function fetchHtml(url) {
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

function extractItem($, element, source) {
  const rawText = normalizeText($(element).text());
  const price = normalizePrice(rawText);

  if (!rawText || price == null) {
    return null;
  }

  const linkTarget = source.linkSelector ? $(element).find(source.linkSelector).first().attr("href") : undefined;
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

  const keywords = Array.isArray(source.keywords) ? source.keywords : [];
  const blockedKeywords = Array.isArray(source.blockedKeywords) ? source.blockedKeywords : [];
  const normalizedTitle = title.toLowerCase();
  const matchesKeywords = keywords.length === 0 || keywords.some((keyword) => normalizedTitle.includes(String(keyword).toLowerCase()));
  const matchesComputerContext = COMPUTER_CONTEXT_KEYWORDS.some((keyword) => normalizedTitle.includes(String(keyword).toLowerCase()));
  const hasBlockedKeyword = [...blockedKeywords, ...GLOBAL_BLOCKED_KEYWORDS].some((keyword) => normalizedTitle.includes(String(keyword).toLowerCase()));

  if (!matchesKeywords || !matchesComputerContext || hasBlockedKeyword) {
    return null;
  }

  return {
    title,
    purpose: source.purpose,
    partType: source.partType,
    category: source.category,
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

function dedupeListings(listings) {
  const seen = new Set();

  return listings.filter((item) => {
    const key = `${item.title}|${item.price}|${item.source ?? ""}`.toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

async function crawlSource(source) {
  const html = await fetchHtml(source.url);
  const $ = cheerio.load(html);
  const items = [];

  $(source.itemSelector).each((_, element) => {
    const listing = extractItem($, element, source);
    if (listing) {
      items.push(listing);
    }
  });

  return items;
}

async function main() {
  const allListings = [];

  for (const source of sources) {
    try {
      console.log(`[crawl] ${source.name} -> ${source.url}`);
      const listings = await crawlSource(source);
      console.log(`[crawl] ${source.name} items: ${listings.length}`);
      allListings.push(...listings);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[crawl] ${source.name} failed:`, message);
    }
  }

  const merged = dedupeListings(allListings);

  // Clear old listings from Supabase
  const { error: deleteError } = await supabase.from("part_listings").delete().neq("id", 0);
  if (deleteError) {
    console.error("❌ Error clearing old listings:", deleteError);
  } else {
    console.log("[db] Cleared old part_listings");
  }

  // Insert new listings into Supabase
  if (merged.length > 0) {
    const { error: insertError } = await supabase
      .from("part_listings")
      .insert(
        merged.map((item) => ({
          title: item.title,
          purpose: item.purpose,
          part_type: item.partType,
          category: item.category,
          price: item.price,
          source: item.source,
          source_site: item.sourceSite,
          scraped_at: item.scrapedAt,
        }))
      );

    if (insertError) {
      console.error("❌ Error inserting listings:", insertError);
    } else {
      console.log(`[db] Inserted ${merged.length} listings to part_listings`);
    }
  }

  // Also save to JSON for backup
  const OUTPUT_PATH = path.join(process.cwd(), "data", "part-listings.json");
  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  console.log(`[backup] wrote ${merged.length} listings to ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});