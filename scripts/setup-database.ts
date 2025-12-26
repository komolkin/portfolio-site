import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("❌ DATABASE_URL is required to create tables.");
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

async function setupDatabase() {
  console.log("🔧 Setting up database...\n");

  try {
    // Test connection first
    await sql`SELECT 1`;
    console.log("✅ Connected to database!");

    // Create the portfolio_items table
    await sql`
      CREATE TABLE IF NOT EXISTS portfolio_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        year TEXT NOT NULL,
        role TEXT NOT NULL,
        scope TEXT NOT NULL,
        link TEXT,
        media_url TEXT,
        media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
        background_color TEXT,
        "order" INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log("✅ Table 'portfolio_items' created!");

    // Add background_color column if it doesn't exist (for existing tables)
    await sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'portfolio_items' AND column_name = 'background_color'
        ) THEN
          ALTER TABLE portfolio_items ADD COLUMN background_color TEXT;
        END IF;
      END $$
    `;

    // Make media_url nullable if it isn't already
    await sql`
      ALTER TABLE portfolio_items ALTER COLUMN media_url DROP NOT NULL
    `;
    console.log("✅ Column 'background_color' ensured!");

    // Enable RLS
    await sql`ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY`;
    console.log("✅ Row Level Security enabled!");

    // Create read policy (drop first if exists)
    await sql`
      DO $$ 
      BEGIN
        DROP POLICY IF EXISTS "Allow public read" ON portfolio_items;
        CREATE POLICY "Allow public read" ON portfolio_items FOR SELECT USING (true);
      END $$
    `;
    console.log("✅ Public read policy created!");

    console.log("\n🎉 Database setup complete!");
  } catch (error: any) {
    console.error("❌ Error:", error.message || error);
    
    if (error.message?.includes("ENOTFOUND") || error.message?.includes("getaddrinfo")) {
      console.log("\n💡 Tip: Make sure you're using the 'Transaction pooler' connection string:");
      console.log("   Supabase Dashboard → Settings → Database → Connection string → Transaction pooler");
      console.log("   It should look like: postgresql://postgres.xxxxx:[PASSWORD]@aws-0-xxx.pooler.supabase.com:6543/postgres");
    }
    
    process.exit(1);
  } finally {
    await sql.end();
  }
}

setupDatabase();
