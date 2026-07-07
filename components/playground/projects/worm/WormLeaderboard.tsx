"use client";

import { useCallback, useEffect, useState } from "react";
import type { WormLeaderboardEntry } from "@/lib/worm-leaderboard";

type WormLeaderboardProps = {
  refreshKey?: number;
};

export default function WormLeaderboard({ refreshKey = 0 }: WormLeaderboardProps) {
  const [entries, setEntries] = useState<WormLeaderboardEntry[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/worm/leaderboard");
      if (!res.ok) return;
      const data = (await res.json()) as { entries: WormLeaderboardEntry[] };
      setEntries(data.entries ?? []);
    } catch {
      // Leaderboard is optional — fail silently
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  if (entries.length === 0) return null;

  return (
    <div className="w-full max-w-[280px] text-sm">
      <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
        Leaderboard
      </p>
      <ol className="space-y-1">
        {entries.map((entry, i) => (
          <li
            key={entry.username}
            className="flex items-baseline gap-3 tabular-nums text-foreground/80"
          >
            <span className="w-5 shrink-0 text-right text-muted-foreground">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 truncate">{entry.username}</span>
            <span className="shrink-0">{entry.score}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
