export const PROJECTS = [
  { id: "pnl-chart", label: "PnL Card" },
  { id: "binary-market", label: "Binary" },
  { id: "leverage-selector", label: "Categorical" },
  { id: "position", label: "Position" },
  { id: "resolved-card", label: "Resolved" },
] as const;

export type ProjectId = (typeof PROJECTS)[number]["id"];

export function projectIdFromIndex1(index1: number): ProjectId {
  return PROJECTS[index1 - 1].id;
}

/** Validates a single path segment like `"1"` or `"2"` (1-based, in range). */
export function parsePlaygroundPathSegment(segment: string): number | null {
  if (!/^\d+$/.test(segment)) return null;
  const n = parseInt(segment, 10);
  if (n < 1 || n > PROJECTS.length) return null;
  return n;
}

/** Resolves which playground project is active from the URL (`/` and `/1` → first). */
export function playgroundIndexFromPathname(pathname: string): number {
  if (pathname === "/") return 1;
  const m = pathname.match(/^\/(\d+)$/);
  if (m) {
    const n = parsePlaygroundPathSegment(m[1]);
    if (n !== null) return n;
  }
  return 1;
}
