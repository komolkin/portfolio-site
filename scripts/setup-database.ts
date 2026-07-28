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
        text_invert BOOLEAN NOT NULL DEFAULT FALSE,
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

    // Add text_invert column if it doesn't exist (for existing tables)
    await sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'portfolio_items' AND column_name = 'text_invert'
        ) THEN
          ALTER TABLE portfolio_items ADD COLUMN text_invert BOOLEAN NOT NULL DEFAULT FALSE;
        END IF;
      END $$
    `;
    console.log("✅ Column 'text_invert' ensured!");

    // Add link_text column if it doesn't exist (for existing tables)
    await sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'portfolio_items' AND column_name = 'link_text'
        ) THEN
          ALTER TABLE portfolio_items ADD COLUMN link_text TEXT;
        END IF;
      END $$
    `;
    console.log("✅ Column 'link_text' ensured!");

    // Enable RLS for portfolio_items
    await sql`ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY`;
    console.log("✅ Row Level Security enabled for portfolio_items!");

    // Create read policy for portfolio_items (drop first if exists)
    await sql`
      DO $$ 
      BEGIN
        DROP POLICY IF EXISTS "Allow public read" ON portfolio_items;
        CREATE POLICY "Allow public read" ON portfolio_items FOR SELECT USING (true);
      END $$
    `;
    console.log("✅ Public read policy created for portfolio_items!");

    // Create the snippets table for Random Snippets masonry grid
    await sql`
      CREATE TABLE IF NOT EXISTS snippets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        image_url TEXT NOT NULL,
        alt TEXT,
        link TEXT,
        "order" INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log("✅ Table 'snippets' created!");

    // Drop aspect_ratio column if it exists (no longer needed, calculated from image)
    await sql`
      DO $$ 
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'snippets' AND column_name = 'aspect_ratio'
        ) THEN
          ALTER TABLE snippets DROP COLUMN aspect_ratio;
        END IF;
      END $$
    `;
    console.log("✅ Column 'aspect_ratio' removed (if existed)!");

    // Add media_type column if it doesn't exist (for video support)
    await sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'snippets' AND column_name = 'media_type'
        ) THEN
          ALTER TABLE snippets ADD COLUMN media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video'));
        END IF;
      END $$
    `;
    console.log("✅ Column 'media_type' ensured for snippets!");

    // Enable RLS for snippets
    await sql`ALTER TABLE snippets ENABLE ROW LEVEL SECURITY`;
    console.log("✅ Row Level Security enabled for snippets!");

    // Create read policy for snippets (drop first if exists)
    await sql`
      DO $$ 
      BEGIN
        DROP POLICY IF EXISTS "Allow public read" ON snippets;
        CREATE POLICY "Allow public read" ON snippets FOR SELECT USING (true);
      END $$
    `;
    console.log("✅ Public read policy created for snippets!");

    // Worm game leaderboard
    await sql`
      CREATE TABLE IF NOT EXISTS worm_scores (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT NOT NULL UNIQUE,
        score INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log("✅ Table 'worm_scores' created!");

    await sql`ALTER TABLE worm_scores ENABLE ROW LEVEL SECURITY`;
    await sql`
      DO $$
      BEGIN
        DROP POLICY IF EXISTS "Allow public read" ON worm_scores;
        CREATE POLICY "Allow public read" ON worm_scores FOR SELECT USING (true);
        DROP POLICY IF EXISTS "Allow public insert" ON worm_scores;
        CREATE POLICY "Allow public insert" ON worm_scores FOR INSERT TO anon, authenticated WITH CHECK (true);
        DROP POLICY IF EXISTS "Allow public update" ON worm_scores;
        CREATE POLICY "Allow public update" ON worm_scores FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
      END $$
    `;
    console.log("✅ Public read/write policies created for worm_scores!");

    // Latest Spotify track — kept until a new song starts playing
    await sql`
      CREATE TABLE IF NOT EXISTS spotify_last_track (
        id TEXT PRIMARY KEY DEFAULT 'current',
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        artwork TEXT NOT NULL DEFAULT '',
        url TEXT NOT NULL,
        played_at TIMESTAMP WITH TIME ZONE,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `;
    console.log("✅ Table 'spotify_last_track' created!");

    await sql`ALTER TABLE spotify_last_track ENABLE ROW LEVEL SECURITY`;
    await sql`
      DO $$
      BEGIN
        DROP POLICY IF EXISTS "Allow public read spotify_last_track" ON spotify_last_track;
        CREATE POLICY "Allow public read spotify_last_track"
          ON spotify_last_track
          FOR SELECT
          TO anon, authenticated
          USING (true);
        DROP POLICY IF EXISTS "Allow public insert spotify_last_track" ON spotify_last_track;
        CREATE POLICY "Allow public insert spotify_last_track"
          ON spotify_last_track
          FOR INSERT
          TO anon, authenticated
          WITH CHECK (true);
        DROP POLICY IF EXISTS "Allow public update spotify_last_track" ON spotify_last_track;
        CREATE POLICY "Allow public update spotify_last_track"
          ON spotify_last_track
          FOR UPDATE
          TO anon, authenticated
          USING (true)
          WITH CHECK (true);
      END $$
    `;
    console.log("✅ Public read/write policies created for spotify_last_track!");

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
