"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { instrumentSans, instrumentSansCondensed } from "@/lib/fonts";

/** Endpoint coords for Figma chart paths (viewBox 259×132). */
const CHART_END_A = { x: 257.9, y: 1.35 };
const CHART_END_B = { x: 257.7, y: 80.13 };

/** Figma Worm-App chart paths (node 9:23) — jagged dual odds series. */
const CHART_PATH_A =
  "M0.89826 118.646L6.13342 129.346L11.3686 120.684L16.6037 120.174L21.8389 129.346L27.0741 114.314L32.3092 114.06L37.5444 121.193L42.7796 115.843L48.0147 111.257L53.2499 124.505L58.4851 107.181L63.7202 126.544L68.9554 128.327L74.1905 122.212L79.4257 116.607L84.6609 125.015L89.896 109.779L95.1312 86.8494L100.366 91.6902L105.602 99.5882L110.837 96.7857L116.072 100.862L121.307 99.843L126.542 110.289L131.777 100.607L137.012 97.8048L142.248 109.525L147.483 101.881L152.718 68.3526L157.953 53.8303L163.188 50.0086L168.423 64.7857L173.659 52.5564L178.894 60.9641L184.129 65.8048L189.364 47.4609L194.599 60.9641L199.834 63.7666L205.07 58.6711L210.305 21.8303L215.54 14.4418L220.775 32.7857L226.01 21.3207L231.245 22.8494L236.481 1.34622L241.716 3.38443L246.951 6.18698L252.186 17.3972L257.898 1.34622";
const CHART_PATH_B =
  "M0.71293 13.3069L6.0242 7.90709L11.3355 3.0858L16.6467 18.3211L21.958 5.97857L27.2693 17.164L32.5805 14.6569L37.8918 4.24291L43.2031 20.2496L48.5144 16.0069L53.8256 5.59287L59.1369 1.54298L64.4482 12.7284L69.7594 3.66435H75.0707L80.382 43.9196L85.6933 41.7983L91.0045 42.3768L96.3158 38.5198L101.627 46.8124L106.938 36.0127L112.25 45.2696L117.561 38.9055L122.872 40.834L128.183 45.2696L133.495 40.2554L138.806 44.3053L144.117 36.2055L149.428 40.4483L154.74 64.1183L160.051 76.8465L165.362 75.8823L170.674 79.1607L175.985 74.5323L181.296 76.0751L186.607 64.504L191.919 62.7683L197.23 75.1108L202.541 64.6969L207.852 78.5822L213.164 69.711L218.475 80.125H223.786L229.098 61.6112L234.409 70.6753L239.72 69.9039L245.031 72.9895L249.002 95.543L257.713 80.125";

export type MarketScreenOption = {
  id: string;
  label: string;
  percent: number;
  color: string;
  logo?: string;
  mark?: string;
};

export type MarketScreenPick = {
  id: string;
  title: string;
  background?: string;
  video?: string;
  /** Live games use ¢ trade pills; upcoming uses circle + combo buttons. */
  live?: boolean;
  options: MarketScreenOption[];
  crypto?: {
    price: string;
    priceValue: number;
    delta: string;
    deltaHint: string;
    deltaUp?: boolean;
    chance: string;
    target: string;
  };
};

export type MarketScreenMarket = {
  id: string;
  kind: "sports" | "crypto" | "topic";
  title: string;
  subtitle?: string;
  logo?: string;
};

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function shortLabel(label: string) {
  if (label.length <= 4) return label.toUpperCase();
  const parts = label.split(/\s+/);
  if (parts.length >= 2) {
    return parts
      .map((part) => part[0])
      .join("")
      .slice(0, 3)
      .toUpperCase();
  }
  return label.slice(0, 3).toUpperCase();
}

function cents(percent: number) {
  return `${(Math.round(percent * 10) / 10).toFixed(1)}¢`;
}

/** Split "Tonight, 8:30 PM" → day + time for the matchup header. */
function splitKickoff(title: string): { day: string; time: string } | null {
  const match = title.match(/^(.+?),\s*(.+)$/);
  if (!match) return null;
  return { day: match[1], time: match[2] };
}

function marketCategory(market: MarketScreenMarket): string {
  if (market.kind === "crypto") return "Crypto";
  if (market.kind === "topic") {
    const key = `${market.id} ${market.title}`.toLowerCase();
    if (key.includes("nvidia") || key.includes("ceo")) return "Tech";
    return "Politics";
  }
  const key = `${market.id} ${market.title}`.toLowerCase();
  if (key.includes("nba") || key.includes("basketball")) return "Basketball";
  if (key.includes("laliga") || key.includes("soccer") || key.includes("football"))
    return "Soccer";
  if (key.includes("atp") || key.includes("tennis")) return "Tennis";
  if (key.includes("cs2") || key.includes("esport")) return "Esports";
  return "Sports";
}

function Emblem({
  logo,
  mark,
  label,
  size,
}: {
  logo?: string;
  mark?: string;
  label: string;
  size: number;
}) {
  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo}
        alt=""
        width={size}
        height={size}
        className="shrink-0 object-contain"
        style={{ width: size, height: size }}
      />
    );
  }
  const glyph = mark ?? shortLabel(label);
  const fontSize =
    glyph === "="
      ? Math.max(14, size * 0.72)
      : Math.max(10, size * 0.34);

  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-white/10 font-semibold tracking-tight text-white"
      style={{ width: size, height: size, fontSize }}
      aria-hidden
    >
      {glyph}
    </span>
  );
}

function formatCountdown(totalSeconds: number) {
  const s = Math.max(0, totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function useDemoCountdown(seed: string) {
  const base = useMemo(() => 4 * 3600 + (hashString(seed) % (8 * 3600)), [seed]);
  const [remaining, setRemaining] = useState(base);
  useEffect(() => {
    setRemaining(base);
    const id = window.setInterval(() => {
      setRemaining((prev) => (prev <= 0 ? base : prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [base]);
  return remaining;
}

/** Dual jagged odds chart — endpoint dots + abbr/% labels (Polymarket-style). */
function MatchOddsChart({
  left,
  right,
}: {
  left: MarketScreenOption;
  right: MarketScreenOption;
}) {
  // Path A rises to the top-right; path B falls — map higher % to rising series.
  const top = left.percent >= right.percent ? left : right;
  const bottom = left.percent >= right.percent ? right : left;

  return (
    <div className="relative h-[188px] w-full">
      <svg
        viewBox="0 0 300 132"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        fill="none"
        aria-hidden
      >
        <path
          d={CHART_PATH_A}
          stroke={top.color}
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={CHART_PATH_B}
          stroke={bottom.color}
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx={CHART_END_A.x}
          cy={CHART_END_A.y}
          r={4}
          fill={top.color}
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx={CHART_END_B.x}
          cy={CHART_END_B.y}
          r={4}
          fill={bottom.color}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div
        className="pointer-events-none absolute right-0 top-0 flex flex-col items-start"
        style={{ transform: "translateY(-2px)" }}
      >
        <span
          className="text-[12px] font-semibold leading-none"
          style={{ color: top.color }}
        >
          {shortLabel(top.label)}
        </span>
        <span
          className={`${instrumentSansCondensed.className} mt-0.5 text-[28px] font-semibold tabular-nums leading-none text-white`}
        >
          {top.percent}%
        </span>
      </div>
      <div
        className="pointer-events-none absolute right-0 flex flex-col items-start"
        style={{ top: "58%" }}
      >
        <span
          className="text-[12px] font-semibold leading-none"
          style={{ color: bottom.color }}
        >
          {shortLabel(bottom.label)}
        </span>
        <span
          className={`${instrumentSansCondensed.className} mt-0.5 text-[28px] font-semibold tabular-nums leading-none text-white`}
        >
          {bottom.percent}%
        </span>
      </div>
    </div>
  );
}

/** Matches feed OptionRow add control (size-12 circle + / check). */
function ComboAddButton({
  selected,
  blocked,
  label,
  onToggle,
}: {
  selected: boolean;
  blocked: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={selected ? `Remove ${label}` : `Add ${label}`}
      aria-pressed={selected}
      disabled={blocked}
      onClick={onToggle}
      className={`relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full transition-colors duration-200 disabled:opacity-35 ${
        selected ? "bg-white/25 text-white" : "bg-[rgba(38,38,38,0.6)]"
      }`}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {selected ? (
          <motion.span
            key="check"
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.55, rotate: -12 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.55, rotate: 12 }}
            transition={{ type: "spring", stiffness: 520, damping: 28 }}
          >
            <svg
              viewBox="0 0 20 20"
              width={20}
              height={20}
              className="size-5"
              fill="none"
              aria-hidden
            >
              <path
                d="M4.5 10.5 8.2 14.2 15.5 5.8"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.span>
        ) : (
          <motion.span
            key="plus"
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.55 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.55 }}
            transition={{ type: "spring", stiffness: 520, damping: 28 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/worm-app-2/icons/plus.svg"
              alt=""
              width={20}
              height={20}
              className="size-5"
            />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

/** Clean market detail — no hero media (Polymarket-style). */
export default function MarketScreen({
  market,
  pick,
  selectedIds,
  atLimit,
  onBack,
  onToggle,
  onTrade,
}: {
  market: MarketScreenMarket;
  pick: MarketScreenPick;
  selectedIds: Set<string>;
  atLimit: boolean;
  onBack: () => void;
  onToggle: (option: MarketScreenOption) => void;
  onTrade?: (option: MarketScreenOption) => void;
}) {
  const [tab, setTab] = useState<"comments" | "rules">("comments");
  const teamOptions = useMemo(
    () =>
      pick.options.filter(
        (option) => option.label.trim().toLowerCase() !== "draw",
      ),
    [pick.options],
  );
  const left = teamOptions[0];
  const right = teamOptions[1] ?? teamOptions[teamOptions.length - 1];
  const isLive = Boolean(pick.live);
  const kickoff = splitKickoff(pick.title);
  const countdown = useDemoCountdown(pick.id);
  const volume = useMemo(() => {
    const n = 0.8 + (hashString(pick.id) % 40) / 10;
    return `$${n.toFixed(1)}K`;
  }, [pick.id]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  return (
    <div
      className={`absolute inset-0 z-40 flex flex-col bg-black text-white ${instrumentSans.className}`}
      role="dialog"
      aria-modal="true"
      aria-label={pick.title}
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(88px+env(safe-area-inset-bottom,0px))] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <header
          className="flex items-center justify-between pt-[max(20px,calc(env(safe-area-inset-top,0px)+10px))]"
        >
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white"
          >
            <svg
              viewBox="0 0 20 20"
              width={20}
              height={20}
              className="size-5"
              fill="none"
              aria-hidden
            >
              <path
                d="M12.5 4.5 7 10l5.5 5.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <p className="min-w-0 truncate px-2 text-center text-[14px] font-medium text-white/55">
            <span className="text-white/40">{marketCategory(market)}</span>
            <span className="mx-1.5 text-white/25">›</span>
            <span className="text-white">
              {market.kind === "topic" ? "NVIDIA" : market.title}
            </span>
          </p>
          <button
            type="button"
            aria-label="Share"
            className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white"
          >
            <svg
              viewBox="0 0 20 20"
              width={18}
              height={18}
              className="size-[18px]"
              fill="none"
              aria-hidden
            >
              <path
                d="M11 4h5v5M16 4 9 11"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M15 11.5V15a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 4 15V7A1.5 1.5 0 0 1 5.5 5.5H9"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        {/* Matchup header */}
        {market.kind === "sports" && left && right ? (
          <div className="mt-5">
            <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
              <button
                type="button"
                aria-label={`Trade ${left.label}`}
                onClick={() => onTrade?.(left)}
                className="flex min-w-0 flex-col items-center gap-1.5 text-center"
              >
                <Emblem
                  logo={left.logo}
                  mark={left.mark}
                  label={left.label}
                  size={44}
                />
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-semibold leading-tight text-white">
                    {left.label}
                  </p>
                  <p className="mt-0.5 text-[12px] font-medium leading-none text-white/40">
                    Home
                  </p>
                </div>
              </button>
              <div className="flex flex-col items-center pt-1 text-center">
                {isLive ? (
                  <p className="text-[13px] font-semibold text-[#FF3B30]">Live</p>
                ) : kickoff ? (
                  <>
                    <p className="text-[13px] font-medium text-white/45">
                      {kickoff.day}
                    </p>
                    <p
                      className={`mt-1 flex items-baseline justify-center gap-2 leading-none ${instrumentSansCondensed.className}`}
                    >
                      <span className="text-[28px] font-semibold text-white/50">
                        in
                      </span>
                      <span className="text-[28px] font-semibold tabular-nums tracking-tight text-white">
                        {formatCountdown(countdown)}
                      </span>
                    </p>
                  </>
                ) : (
                  <p className="text-[15px] font-semibold text-white">
                    {pick.title}
                  </p>
                )}
                <button
                  type="button"
                  className="mt-3 h-8 rounded-full px-4 text-[13px] font-medium text-white/75 ring-1 ring-inset ring-white/25"
                >
                  Standings
                </button>
              </div>
              <button
                type="button"
                aria-label={`Trade ${right.label}`}
                onClick={() => onTrade?.(right)}
                className="flex min-w-0 flex-col items-center gap-1.5 text-center"
              >
                <Emblem
                  logo={right.logo}
                  mark={right.mark}
                  label={right.label}
                  size={44}
                />
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-semibold leading-tight text-white">
                    {right.label}
                  </p>
                  <p className="mt-0.5 text-[12px] font-medium leading-none text-white/40">
                    Away
                  </p>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 text-center">
            <p className="text-[20px] font-semibold leading-snug text-white">
              {market.kind === "topic" ? market.title : pick.title}
            </p>
            {pick.crypto ? (
              <p className="mt-2 text-[14px] text-white/50">
                {pick.crypto.price} · {pick.crypto.delta} {pick.crypto.deltaHint}
              </p>
            ) : null}
          </div>
        )}

        {/* Odds chart — sports matchups only */}
        {market.kind === "sports" && left && right ? (
          <div className="mt-7">
            <MatchOddsChart left={left} right={right} />
            <p className="mt-2 text-[12px] tabular-nums text-white/40">
              24h Vol {volume}
            </p>
          </div>
        ) : null}

        {/* Outcome rows — live: ¢ pills; upcoming: feed-style bars + circle + */}
        <div className="mt-6 flex flex-col gap-2">
          {pick.options.map((option, index) => {
            const selected = selectedIds.has(option.id);
            const blocked = !selected && atLimit;
            const priceColor =
              index === 0 ? option.color : "rgba(255,255,255,0.12)";
            const priceText = index === 0 ? "#fff" : "rgba(255,255,255,0.85)";

            if (isLive) {
              return (
                <div key={option.id} className="flex items-center gap-3">
                  <Emblem
                    logo={option.logo}
                    mark={option.mark}
                    label={option.label}
                    size={28}
                  />
                  <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-white">
                    {option.label}
                  </p>
                  <p className="shrink-0 text-[15px] font-semibold tabular-nums text-white/55">
                    {option.percent}%
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      onTrade ? onTrade(option) : onToggle(option)
                    }
                    className="h-10 shrink-0 rounded-full px-3.5 text-[14px] font-semibold tabular-nums"
                    style={{ backgroundColor: priceColor, color: priceText }}
                    aria-label={`Trade ${option.label} at ${cents(option.percent)}`}
                  >
                    {cents(option.percent)}
                  </button>
                </div>
              );
            }

            return (
              <div
                key={option.id}
                className="flex w-full items-start gap-2 overflow-hidden"
              >
                <button
                  type="button"
                  aria-label={`Trade ${option.label} · ${option.percent}%`}
                  onClick={() => onTrade?.(option)}
                  className="relative flex h-12 min-w-0 flex-1 items-center justify-between overflow-hidden rounded-full bg-[rgba(38,38,38,0.6)] pl-3 pr-4 text-left"
                >
                  <div
                    aria-hidden
                    className="absolute inset-y-0 left-0 opacity-70"
                    style={{
                      width: `${option.percent}%`,
                      backgroundColor: option.color,
                    }}
                  />
                  <div className="relative z-[1] flex items-center gap-2.5 overflow-hidden">
                    {option.logo || option.mark ? (
                      <Emblem
                        logo={option.logo}
                        mark={option.mark}
                        label={option.label}
                        size={24}
                      />
                    ) : null}
                    <span className="truncate text-[16px] font-medium text-white">
                      {option.label}
                    </span>
                  </div>
                  <span className="relative z-[1] shrink-0 text-[20px] font-semibold tabular-nums text-white">
                    {option.percent}%
                  </span>
                </button>
                <ComboAddButton
                  selected={selected}
                  blocked={blocked}
                  label={option.label}
                  onToggle={() => onToggle(option)}
                />
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex items-end border-b border-white/10">
          <div className="flex gap-5">
            {(
              [
                ["comments", "Comments"],
                ["rules", "Rules"],
              ] as const
            ).map(([id, label]) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`relative pb-2.5 text-[15px] font-semibold transition-colors duration-200 ${
                    active ? "text-white" : "text-white/40"
                  }`}
                >
                  {label}
                  {active ? (
                    <motion.span
                      layoutId="market-tab-underline"
                      className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-white"
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 34,
                      }}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {tab === "comments" ? (
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex h-11 items-center rounded-full bg-white/[0.08] px-4 text-[14px] text-white/40">
              Sign in to comment
            </div>
            <p className="text-center text-[14px] text-white/35">
              No comments yet
            </p>
          </div>
        ) : (
          <p className="mt-4 text-[14px] leading-relaxed text-white/70">
            {market.kind === "sports"
              ? `This market resolves to the side that wins. ${pick.title}. Overtime and series maps count.`
              : market.kind === "topic"
                ? `This market resolves to the listed date if the event occurs by then, otherwise later outcomes.`
                : `This market resolves to Yes if the target is met at the listed deadline, otherwise No.`}
          </p>
        )}
      </div>
    </div>
  );
}
