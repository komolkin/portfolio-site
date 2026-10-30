"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ui } from "./ui";

const CLOSE_THRESHOLD_PX = 72;

export type PulseMinSize = "all" | "1k" | "5k" | "10k" | "custom";
export type PulseCategory =
  | "all"
  | "sports"
  | "politics"
  | "crypto"
  | "tech"
  | "weather";
export type PulseLeague =
  | "all"
  | "premier-league"
  | "la-liga"
  | "champions-league"
  | "nba"
  | "nfl"
  | "mlb"
  | "nhl";

export type PulseFilters = {
  minSize: PulseMinSize;
  customMinUsd: number | null;
  category: PulseCategory;
  league: PulseLeague;
};

export const DEFAULT_PULSE_FILTERS: PulseFilters = {
  minSize: "all",
  customMinUsd: null,
  category: "all",
  league: "all",
};

const MIN_SIZE_OPTIONS: { id: Exclude<PulseMinSize, "custom">; label: string }[] =
  [
    { id: "all", label: "All" },
    { id: "1k", label: ">$1K" },
    { id: "5k", label: ">$5K" },
    { id: "10k", label: ">$10K" },
  ];

const CATEGORY_OPTIONS: { id: PulseCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "sports", label: "Sports" },
  { id: "politics", label: "Politics" },
  { id: "crypto", label: "Crypto" },
  { id: "tech", label: "Tech" },
  { id: "weather", label: "Weather" },
];

const LEAGUE_OPTIONS: { id: PulseLeague; label: string }[] = [
  { id: "all", label: "All" },
  { id: "premier-league", label: "Premier League" },
  { id: "la-liga", label: "La Liga" },
  { id: "champions-league", label: "Champions League" },
  { id: "nba", label: "NBA" },
  { id: "nfl", label: "NFL" },
  { id: "mlb", label: "MLB" },
  { id: "nhl", label: "NHL" },
];

const MIN_SIZE_USD: Record<Exclude<PulseMinSize, "all" | "custom">, number> = {
  "1k": 1_000,
  "5k": 5_000,
  "10k": 10_000,
};

const CATEGORY_MATCH: Record<
  Exclude<PulseCategory, "all">,
  { categories: string[]; title?: RegExp }
> = {
  sports: {
    categories: ["sports"],
    title:
      /\b(nba|nfl|mlb|nhl|soccer|football|tennis|ufc|mma|epl|premier league|la liga|champions league|f1|formula)\b/i,
  },
  politics: {
    categories: ["politics", "elections"],
    title: /\b(trump|biden|election|president|senate|congress|fed\b|rate hike)\b/i,
  },
  crypto: {
    categories: ["crypto", "bitcoin", "ethereum"],
    title: /\b(btc|bitcoin|eth|ethereum|crypto|solana|sol\b)\b/i,
  },
  tech: {
    categories: ["tech", "technology", "ai"],
    title: /\b(apple|google|openai|ai\b|nvidia|tesla|tech)\b/i,
  },
  weather: {
    categories: ["weather"],
    title: /\b(weather|temperature|hurricane|storm|rain|snow)\b/i,
  },
};

const LEAGUE_MATCH: Record<Exclude<PulseLeague, "all">, RegExp> = {
  "premier-league": /\b(premier league|epl)\b/i,
  "la-liga": /\bla liga\b/i,
  "champions-league": /\b(champions league|ucl)\b/i,
  nba: /\bnba\b|lakers|celtics|warriors|raptors|pistons|nuggets|thunder/i,
  nfl: /\bnfl\b|super bowl|chiefs|bills|patriots/i,
  mlb: /\bmlb\b|yankees|dodgers|world series/i,
  nhl: /\bnhl\b|stanley cup/i,
};

export function pulseFiltersActive(filters: PulseFilters): boolean {
  return (
    filters.minSize !== "all" ||
    filters.category !== "all" ||
    (filters.category === "sports" && filters.league !== "all")
  );
}

export function pulseMinUsd(filters: PulseFilters): number {
  if (filters.minSize === "all") return 0;
  if (filters.minSize === "custom") return Math.max(0, filters.customMinUsd ?? 0);
  return MIN_SIZE_USD[filters.minSize];
}

export function tradeMatchesPulseFilters(
  trade: {
    amountUsd: number;
    marketTitle: string;
    marketCategory?: string | null;
    marketSlug?: string | null;
  },
  filters: PulseFilters,
): boolean {
  const minUsd = pulseMinUsd(filters);
  if (minUsd > 0 && trade.amountUsd < minUsd) return false;

  if (filters.category !== "all") {
    const rule = CATEGORY_MATCH[filters.category];
    const cat = (trade.marketCategory ?? "").trim().toLowerCase();
    const haystack = `${trade.marketTitle} ${trade.marketSlug ?? ""}`;
    const catHit = rule.categories.some((item) => cat.includes(item));
    const titleHit = rule.title ? rule.title.test(haystack) : false;
    if (!catHit && !titleHit) return false;
  }

  if (filters.category === "sports" && filters.league !== "all") {
    const haystack = `${trade.marketTitle} ${trade.marketSlug ?? ""} ${trade.marketCategory ?? ""}`;
    if (!LEAGUE_MATCH[filters.league].test(haystack)) return false;
  }

  return true;
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M8 7.2v3.6M8 5.2h.01"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FilterChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-sfx="press"
      aria-pressed={selected}
      onClick={onClick}
      className={`inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-[13px] font-semibold transition-colors ${
        selected
          ? "border-white/[0.16] bg-white/[0.14] text-white"
          : "border-white/[0.14] bg-transparent text-white/75 hover:border-white/25 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

export default function PulseFiltersSheet({
  value,
  onChange,
  onClose,
}: {
  value: PulseFilters;
  onChange: (next: PulseFilters) => void;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [drawerOffset, setDrawerOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [draft, setDraft] = useState<PulseFilters>(value);
  const [customText, setCustomText] = useState(
    value.customMinUsd != null ? String(value.customMinUsd) : "",
  );
  const dragStartY = useRef(0);
  const dragStartOffset = useRef(0);
  const closeTimerRef = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const closeSheet = () => {
    setOpen(false);
    setDrawerOffset(0);
    setIsDragging(false);
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => onCloseRef.current(), 280);
  };

  const closeSheetRef = useRef(closeSheet);
  closeSheetRef.current = closeSheet;

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setOpen(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSheetRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const commit = (next: PulseFilters) => {
    setDraft(next);
    onChange(next);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button,input")) return;
    setIsDragging(true);
    dragStartY.current = event.clientY;
    dragStartOffset.current = drawerOffset;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const delta = event.clientY - dragStartY.current;
    setDrawerOffset(Math.max(0, dragStartOffset.current + delta));
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsDragging(false);
    if (drawerOffset > CLOSE_THRESHOLD_PX) {
      closeSheet();
      return;
    }
    setDrawerOffset(0);
  };

  const setMinSize = (id: Exclude<PulseMinSize, "custom">) => {
    commit({
      ...draft,
      minSize: id,
      customMinUsd: id === "all" ? null : draft.customMinUsd,
    });
    if (id !== "custom") setCustomText("");
  };

  const setCategory = (id: PulseCategory) => {
    commit({
      ...draft,
      category: id,
      league: id === "sports" ? draft.league : "all",
    });
  };

  const applyCustom = (raw: string) => {
    setCustomText(raw);
    const digits = raw.replace(/[^\d]/g, "");
    if (!digits) {
      commit({ ...draft, minSize: "custom", customMinUsd: null });
      return;
    }
    commit({
      ...draft,
      minSize: "custom",
      customMinUsd: Number.parseInt(digits, 10),
    });
  };

  const reset = () => {
    setCustomText("");
    commit(DEFAULT_PULSE_FILTERS);
  };

  return (
    <div className="absolute inset-0 z-50">
      <div
        className={`absolute inset-0 ${ui.backdrop} transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={closeSheet}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        className={`absolute inset-x-0 bottom-0 flex max-h-[82%] flex-col overflow-hidden rounded-t-[1.75rem] ${ui.sheet} shadow-[0_-12px_40px_rgba(0,0,0,0.45)]`}
        style={{
          transform: open
            ? `translateY(${drawerOffset}px)`
            : "translateY(100%)",
          transition: isDragging
            ? "none"
            : "transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        <div
          className="flex shrink-0 touch-none flex-col px-5 pb-3 pt-2"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <span
            aria-hidden
            className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/30"
          />
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[20px] font-semibold tracking-[-0.03em]">
              Filters
            </h2>
            <button
              type="button"
              data-sfx="press"
              onClick={reset}
              className="text-[14px] font-semibold text-white/45 transition-colors hover:text-white/75"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <section>
            <div className="mb-3 flex items-center gap-1.5">
              <h3 className="text-[15px] font-semibold text-white">Min size</h3>
              <span
                className="text-white/35"
                title="Only show trades at or above this size"
              >
                <InfoIcon className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {MIN_SIZE_OPTIONS.map((option) => (
                <FilterChip
                  key={option.id}
                  label={option.label}
                  selected={draft.minSize === option.id}
                  onClick={() => setMinSize(option.id)}
                />
              ))}
              <label
                className={`inline-flex h-9 min-w-[5.5rem] shrink-0 items-center rounded-full border px-3.5 text-[13px] font-semibold transition-colors ${
                  draft.minSize === "custom"
                    ? "border-white/[0.16] bg-white/[0.14] text-white"
                    : "border-white/[0.14] bg-transparent text-white/45"
                }`}
              >
                <span className="mr-0.5 text-white/55">$</span>
                <input
                  inputMode="numeric"
                  placeholder="Custom"
                  value={customText}
                  onFocus={() => {
                    if (draft.minSize !== "custom") {
                      commit({ ...draft, minSize: "custom" });
                    }
                  }}
                  onChange={(event) => applyCustom(event.target.value)}
                  className="w-[4.5rem] bg-transparent outline-none placeholder:text-white/40"
                  aria-label="Custom minimum size"
                />
              </label>
            </div>
          </section>

          <section className="mt-7">
            <h3 className="mb-3 text-[15px] font-semibold text-white">
              Category
            </h3>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((option) => (
                <FilterChip
                  key={option.id}
                  label={option.label}
                  selected={draft.category === option.id}
                  onClick={() => setCategory(option.id)}
                />
              ))}
            </div>
          </section>

          <AnimatePresence initial={false}>
            {draft.category === "sports" ? (
              <motion.section
                key="league-filters"
                initial={{ height: 0, opacity: 0, y: -6 }}
                animate={{ height: "auto", opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: -6 }}
                transition={{
                  duration: 0.28,
                  ease: [0.32, 0.72, 0, 1],
                }}
                className="overflow-hidden"
              >
                <div className="mt-7">
                  <h3 className="mb-3 text-[15px] font-semibold text-white">
                    League
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {LEAGUE_OPTIONS.map((option) => (
                      <FilterChip
                        key={option.id}
                        label={option.label}
                        selected={draft.league === option.id}
                        onClick={() =>
                          commit({ ...draft, league: option.id })
                        }
                      />
                    ))}
                  </div>
                </div>
              </motion.section>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
