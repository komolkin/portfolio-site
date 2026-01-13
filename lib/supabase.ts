import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase credentials not configured");
    return null;
  }

  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }

  return supabaseInstance;
}

export const supabase = getSupabaseClient();

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  year: string;
  role: string;
  scope: string;
  link: string | null;
  link_text: string | null;
  media_url: string | null;
  media_type: "image" | "video";
  background_color: string | null;
  text_invert: boolean;
  order: number;
  created_at: string;
}

export interface Snippet {
  id: string;
  image_url: string;
  alt: string | null;
  link: string | null;
  media_type: "image" | "video";
  order: number;
  created_at: string;
}

export async function getPortfolioItems(): Promise<PortfolioItem[]> {
  const client = getSupabaseClient();
  
  if (!client) {
    console.warn("Supabase not configured, returning empty portfolio");
    return [];
  }

  const { data, error } = await client
    .from("portfolio_items")
    .select("*")
    .order("order", { ascending: true });

  if (error) {
    console.error("Error fetching portfolio items:", error);
    return [];
  }

  return data || [];
}

export async function getSnippets(): Promise<Snippet[]> {
  const client = getSupabaseClient();
  
  if (!client) {
    console.warn("Supabase not configured, returning empty snippets");
    return [];
  }

  const { data, error } = await client
    .from("snippets")
    .select("*")
    .order("order", { ascending: true });

  if (error) {
    console.error("Error fetching snippets:", error);
    return [];
  }

  return data || [];
}
