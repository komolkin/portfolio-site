import { createClient, SupabaseClient } from "@supabase/supabase-js";

export type WormLeaderboardEntry = {
  username: string;
  score: number;
};

const USERNAME_MAX = 20;

function getClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export function normalizeUsername(raw: string): string | null {
  const username = raw.trim().slice(0, USERNAME_MAX);
  if (username.length < 1) return null;
  return username;
}

export async function getWormLeaderboard(
  limit = 10
): Promise<WormLeaderboardEntry[]> {
  const client = getClient();
  if (!client) return [];

  const { data, error } = await client
    .from("worm_scores")
    .select("username, score")
    .order("score", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching worm leaderboard:", error);
    return [];
  }

  return data ?? [];
}

export async function submitWormScore(
  rawUsername: string,
  score: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  const username = normalizeUsername(rawUsername);
  if (!username) return { ok: false, error: "Invalid username" };
  if (!Number.isFinite(score) || score < 0 || score > 9999) {
    return { ok: false, error: "Invalid score" };
  }

  const client = getClient();
  if (!client) return { ok: false, error: "Leaderboard unavailable" };

  const { data: existing, error: fetchError } = await client
    .from("worm_scores")
    .select("score")
    .eq("username", username)
    .maybeSingle();

  if (fetchError) {
    console.error("Error fetching worm score:", fetchError);
    return { ok: false, error: "Failed to save score" };
  }

  if (existing && score <= existing.score) {
    return { ok: true };
  }

  const { error } = await client.from("worm_scores").upsert(
    {
      username,
      score,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "username" }
  );

  if (error) {
    console.error("Error saving worm score:", error);
    return { ok: false, error: "Failed to save score" };
  }

  return { ok: true };
}
