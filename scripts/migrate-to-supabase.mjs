import { readFile } from "fs/promises";
import path from "path";
import { createClient } from "@supabase/supabase-js";

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

async function migratePartListings() {
  try {
    console.log("[migrate] Loading part-listings.json...");
    const partPath = path.join(process.cwd(), "data", "part-listings.json");
    const raw = await readFile(partPath, "utf8");
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      console.error("❌ part-listings.json is not an array");
      return;
    }

    console.log(`[migrate] Found ${parsed.length} part listings`);

    // Clear existing data
    const { error: deleteError } = await supabase.from("part_listings").delete().neq("id", 0);
    if (deleteError) {
      console.error("❌ Error clearing old part listings:", deleteError);
      return;
    }

    // Insert new data
    const toInsert = parsed.map((item) => ({
      title: item.title,
      purpose: item.purpose,
      part_type: item.partType,
      category: item.category,
      price: item.price,
      source: item.source,
      source_site: item.sourceSite,
      scraped_at: item.scrapedAt,
    }));

    const { error: insertError } = await supabase.from("part_listings").insert(toInsert);
    if (insertError) {
      console.error("❌ Error inserting part listings:", insertError);
      return;
    }

    console.log(`✅ Migrated ${toInsert.length} part listings to Supabase`);
  } catch (error) {
    console.error("❌ Error migrating part listings:", error);
  }
}

async function migrateMarketListings() {
  try {
    console.log("[migrate] Loading market-listings.json...");
    const marketPath = path.join(process.cwd(), "data", "market-listings.json");
    const raw = await readFile(marketPath, "utf8");
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      console.error("❌ market-listings.json is not an array");
      return;
    }

    console.log(`[migrate] Found ${parsed.length} market listings`);

    // Clear existing data
    const { error: deleteError } = await supabase.from("market_listings").delete().neq("id", 0);
    if (deleteError) {
      console.error("❌ Error clearing old market listings:", deleteError);
      return;
    }

    // Insert new data
    const toInsert = parsed.map((item) => ({
      title: item.title,
      category: item.category,
      purpose: item.purpose,
      cpu: item.cpu || null,
      gpu: item.gpu || null,
      ram: item.ram || null,
      storage: item.storage || null,
      price: item.price,
      condition: item.condition || null,
      source: item.source,
      scraped_at: item.scrapedAt,
    }));

    const { error: insertError } = await supabase.from("market_listings").insert(toInsert);
    if (insertError) {
      console.error("❌ Error inserting market listings:", insertError);
      return;
    }

    console.log(`✅ Migrated ${toInsert.length} market listings to Supabase`);
  } catch (error) {
    console.error("❌ Error migrating market listings:", error);
  }
}

async function main() {
  console.log("🔄 Starting migration to Supabase...\n");
  await migratePartListings();
  console.log();
  await migrateMarketListings();
  console.log("\n✅ Migration complete!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
