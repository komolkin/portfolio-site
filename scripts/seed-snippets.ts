import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("❌ DATABASE_URL is required to seed snippets.");
  console.log("\n📍 To get your DATABASE_URL:");
  console.log("1. Go to Supabase Dashboard → Settings → Database");
  console.log("2. Scroll to 'Connection string' section");
  console.log("3. Select 'Transaction pooler' tab (important!)");
  console.log("4. Copy the connection string");
  console.log("5. Add it to your .env.local as DATABASE_URL=...");
  console.log("\n⚠️  Make sure to replace [YOUR-PASSWORD] with your actual database password!");
  process.exit(1);
}

console.log("🔌 Connecting to database...");

const sql = postgres(databaseUrl, { 
  ssl: "require",
  connect_timeout: 30,
});

const sampleSnippets = [
  {
    image_url: "https://picsum.photos/seed/snippet1/600/800",
    alt: "Design exploration 1",
    order: 1,
  },
  {
    image_url: "https://picsum.photos/seed/snippet2/600/400",
    alt: "Design exploration 2",
    order: 2,
  },
  {
    image_url: "https://picsum.photos/seed/snippet3/600/600",
    alt: "Design exploration 3",
    order: 3,
  },
  {
    image_url: "https://picsum.photos/seed/snippet4/600/900",
    alt: "Design exploration 4",
    order: 4,
  },
  {
    image_url: "https://picsum.photos/seed/snippet5/600/500",
    alt: "Design exploration 5",
    order: 5,
  },
  {
    image_url: "https://picsum.photos/seed/snippet6/600/700",
    alt: "Design exploration 6",
    order: 6,
  },
  {
    image_url: "https://picsum.photos/seed/snippet7/600/450",
    alt: "Design exploration 7",
    order: 7,
  },
  {
    image_url: "https://picsum.photos/seed/snippet8/600/850",
    alt: "Design exploration 8",
    order: 8,
  },
  {
    image_url: "https://picsum.photos/seed/snippet9/600/550",
    alt: "Design exploration 9",
    order: 9,
  },
];

async function seedSnippets() {
  console.log("🌱 Seeding snippets...\n");

  try {
    // Test connection first
    await sql`SELECT 1`;
    console.log("✅ Connected to database!");

    // Clear existing snippets
    await sql`DELETE FROM snippets`;
    console.log("✅ Cleared existing snippets!");

    // Insert sample snippets
    for (const snippet of sampleSnippets) {
      await sql`
        INSERT INTO snippets (image_url, alt, "order")
        VALUES (${snippet.image_url}, ${snippet.alt}, ${snippet.order})
      `;
    }
    console.log(`✅ Inserted ${sampleSnippets.length} snippets!`);

    console.log("\n🎉 Snippets seeded successfully!");
  } catch (error: any) {
    console.error("❌ Error:", error.message || error);
    
    if (error.message?.includes("relation \"snippets\" does not exist")) {
      console.log("\n💡 Tip: Run 'npm run db:setup' first to create the snippets table.");
    }
    
    process.exit(1);
  } finally {
    await sql.end();
  }
}

seedSnippets();

