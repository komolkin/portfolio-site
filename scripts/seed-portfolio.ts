import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseServiceKey) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY is required to seed data.");
  process.exit(1);
}

// Use service role key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const portfolioItems = [
  {
    title: "Self-Isolation Index",
    description:
      "When COVID-19 just hit Russia we calculated the index that showed how well people were self-isolating using anonymous data from our services. According to the Higher School of Economics, it helped to save 80,000 lives in the first months of the pandemic and became adopted on federal level.",
    year: "2020",
    role: "Lead Product Designer",
    scope: "Concept, UI/UX Design",
    link: "https://yandex.com/covid",
    media_url: "https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=1200&h=800&fit=crop",
    media_type: "image",
    background_color: "#1a1a2e",
    order: 1,
  },
  {
    title: "Music Streaming Platform",
    description:
      "Redesigned the core listening experience for a major music streaming service. Focused on personalization, discovery, and seamless playback across devices. Increased user engagement by 34% and reduced churn by 18%.",
    year: "2021",
    role: "Senior Product Designer",
    scope: "Product Strategy, UI/UX Design, Prototyping",
    link: null,
    media_url: "https://images.unsplash.com/photo-1611339555312-e607c8352fd7?w=1200&h=800&fit=crop",
    media_type: "image",
    background_color: "#16213e",
    order: 2,
  },
  {
    title: "AI Writing Assistant",
    description:
      "Built an AI-powered writing companion that helps users craft better emails, documents, and creative content. Designed the interaction patterns for real-time suggestions and tone adjustments.",
    year: "2022",
    role: "Design Lead",
    scope: "AI/UX Research, Interaction Design, Visual Design",
    link: "https://example.com/ai-writer",
    media_url: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=800&fit=crop",
    media_type: "image",
    background_color: "#0f3460",
    order: 3,
  },
  {
    title: "Fintech Mobile App",
    description:
      "End-to-end design of a mobile banking application for Gen Z users. Gamified savings features, social payments, and a fresh visual language that resonated with younger audiences.",
    year: "2023",
    role: "Product Designer",
    scope: "Mobile Design, Design System, User Research",
    link: "https://example.com/fintech",
    media_url: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1200&h=800&fit=crop",
    media_type: "image",
    background_color: "#1a1a2e",
    order: 4,
  },
  {
    title: "Smart Home Dashboard",
    description:
      "Designed an intuitive control center for connected home devices. Focused on accessibility, quick actions, and ambient awareness. The interface adapts based on time of day and user routines.",
    year: "2024",
    role: "Principal Designer",
    scope: "IoT Design, Dashboard UI, Accessibility",
    link: null,
    media_url: "https://images.unsplash.com/photo-1558002038-1055907df827?w=1200&h=800&fit=crop",
    media_type: "image",
    background_color: "#2d3436",
    order: 5,
  },
];

async function seed() {
  console.log("🌱 Seeding portfolio items...");

  const { data, error } = await supabase
    .from("portfolio_items")
    .insert(portfolioItems)
    .select();

  if (error) {
    console.error("❌ Error seeding data:", error);
    process.exit(1);
  }

  console.log(`✅ Successfully inserted ${data.length} portfolio items!`);
  console.log(data);
}

seed();

