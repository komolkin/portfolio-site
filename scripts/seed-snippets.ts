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
    media_type: "image",
    order: 1,
  },
  {
    image_url: "https://picsum.photos/seed/snippet2/600/400",
    alt: "Design exploration 2",
    media_type: "image",
    order: 2,
  },
  {
    image_url: "https://picsum.photos/seed/snippet3/600/600",
    alt: "Design exploration 3",
    media_type: "image",
    order: 3,
  },
  {
    image_url: "https://picsum.photos/seed/snippet4/600/900",
    alt: "Design exploration 4",
    media_type: "image",
    order: 4,
  },
  {
    image_url: "https://picsum.photos/seed/snippet5/600/500",
    alt: "Design exploration 5",
    media_type: "image",
    order: 5,
  },
  {
    image_url: "https://picsum.photos/seed/snippet6/600/700",
    alt: "Design exploration 6",
    media_type: "image",
    order: 6,
  },
  {
    image_url: "https://picsum.photos/seed/snippet7/600/450",
    alt: "Design exploration 7",
    media_type: "image",
    order: 7,
  },
  {
    image_url: "https://picsum.photos/seed/snippet8/600/850",
    alt: "Design exploration 8",
    media_type: "image",
    order: 8,
  },
  {
    image_url: "https://picsum.photos/seed/snippet9/600/550",
    alt: "Design exploration 9",
    media_type: "image",
    order: 9,
  },
  {
    image_url: "https://picsum.photos/seed/snippet10/600/750",
    alt: "Design exploration 10",
    media_type: "image",
    order: 10,
  },
  {
    image_url: "https://picsum.photos/seed/snippet11/600/480",
    alt: "Design exploration 11",
    media_type: "image",
    order: 11,
  },
  {
    image_url: "https://picsum.photos/seed/snippet12/600/920",
    alt: "Design exploration 12",
    media_type: "image",
    order: 12,
  },
  {
    image_url: "https://picsum.photos/seed/snippet13/600/560",
    alt: "Design exploration 13",
    media_type: "image",
    order: 13,
  },
  {
    image_url: "https://picsum.photos/seed/snippet14/600/680",
    alt: "Design exploration 14",
    media_type: "image",
    order: 14,
  },
  {
    image_url: "https://picsum.photos/seed/snippet15/600/420",
    alt: "Design exploration 15",
    media_type: "image",
    order: 15,
  },
  {
    image_url: "https://picsum.photos/seed/snippet16/600/780",
    alt: "Design exploration 16",
    media_type: "image",
    order: 16,
  },
  {
    image_url: "https://picsum.photos/seed/snippet17/600/600",
    alt: "Design exploration 17",
    media_type: "image",
    order: 17,
  },
  {
    image_url: "https://picsum.photos/seed/snippet18/600/520",
    alt: "Design exploration 18",
    media_type: "image",
    order: 18,
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
        INSERT INTO snippets (image_url, alt, media_type, "order")
        VALUES (${snippet.image_url}, ${snippet.alt}, ${snippet.media_type}, ${snippet.order})
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

