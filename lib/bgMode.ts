export type BgMode = "gradient" | "flat" | "focus";

export const BG_MODE_KEY = "bg-mode";
export const DEFAULT_BG_MODE: BgMode = "flat";

export const BG_MODE_ORDER: readonly BgMode[] = [
  "flat",
  "gradient",
  "focus",
] as const;

export function isBgMode(value: string | null | undefined): value is BgMode {
  return value === "flat" || value === "gradient" || value === "focus";
}

export function nextBgMode(current: BgMode): BgMode {
  const index = BG_MODE_ORDER.indexOf(current);
  return BG_MODE_ORDER[(index + 1) % BG_MODE_ORDER.length] ?? DEFAULT_BG_MODE;
}
