import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  year: string;
  role: string;
  scope: string;
  link: string | null;
  media_url: string | null;
  media_type: "image" | "video";
  background_color: string | null;
  order: number;
  created_at: string;
}

export async function getPortfolioItems(): Promise<PortfolioItem[]> {
  const { data, error } = await supabase
    .from("portfolio_items")
    .select("*")
    .order("order", { ascending: true });

  if (error) {
    console.error("Error fetching portfolio items:", error);
    return [];
  }

  return data || [];
}

