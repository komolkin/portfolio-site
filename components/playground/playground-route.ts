export const PROJECTS = [
  { id: "ai-cam", label: "Selfie" },
  { id: "mcp", label: "MCP" },
  { id: "thinking", label: "Thinking" },
  { id: "ball", label: "Ball" },
  { id: "position-1", label: "Position #1" },
  { id: "position-2", label: "Position #2" },
  { id: "position-3", label: "Position #3" },
  { id: "pnl-chart", label: "PnL" },
  { id: "binary-compact", label: "Binary Compact" },
  { id: "leverage-selector", label: "Categorical" },
  { id: "resolved-card", label: "Resolved" },
  { id: "worm", label: "Worm" },
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
