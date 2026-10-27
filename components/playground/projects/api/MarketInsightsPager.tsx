"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import type { PolymarketMarketData } from "@/lib/polymarketscan";
import {
  pushTextWords,
  StreamingWords,
  WORD_DURATION,
  WORD_STAGGER,
  type StreamingWord,
} from "@/components/StreamingWords";

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pct(price: number): number {
  if (!Number.isFinite(price)) return 50;
  return Math.round(Math.max(0, Math.min(1, price)) * 100);
}

function formatUsdShort(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)
    return `$${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return `$${Math.round(value)}`;
}

function hoursUntil(iso: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return (t - Date.now()) / 3_600_000;
}

function sideLabels(market: PolymarketMarketData): [string, string] {
  const outcomes = (market.outcomes ?? [])
    .map((o) => o.label.trim())
    .filter(Boolean);
  if (outcomes.length >= 2) return [outcomes[0]!, outcomes[1]!];
  const teams = market.teams ?? [];
  if (teams.length >= 2) return [teams[0]!.name, teams[1]!.name];
  return ["Yes", "No"];
}

/** Pause after a sentence finishes streaming before the next one. */
const HOLD_MS = 3000;

/** Several short takes for this market — cycled with a typewriter reveal. */
function insightSentences(market: PolymarketMarketData): string[] {
  const yes = pct(market.yesPrice);
  const no = pct(market.noPrice);
  const [a, b] = sideLabels(market);
  const favorite = yes >= no ? a : b;
  const underdog = yes >= no ? b : a;
  const favPct = Math.max(yes, no);
  const dogPct = Math.min(yes, no);
  const changePts =
    market.price24hChange != null
      ? Math.round(market.price24hChange * 100)
      : null;
  const vol24 = formatUsdShort(market.volume24h);
  const hours = hoursUntil(market.closesAt);
  const game = market.liveGame;
  const lines: string[] = [];

  if (game?.status === "live") {
    const clock = game.clock?.trim();
    const hasScore = game.away?.score != null && game.home?.score != null;
    if (hasScore) {
      const away = game.away!;
      const home = game.home!;
      const tied = away.score === home.score;
      const leader =
        (away.score ?? 0) >= (home.score ?? 0) ? away.name : home.name;
      if (tied) {
        lines.push(
          clock
            ? `Live and tied at ${away.score}–${home.score} (${clock}). The next possession can reprice both sides.`
            : `Live and tied at ${away.score}–${home.score}. Small swings still move this market hard.`,
        );
      } else {
        lines.push(
          clock
            ? `${leader} leads ${Math.max(away.score!, home.score!)}–${Math.min(away.score!, home.score!)} with ${clock} left. Trade the live edge before the next run.`
            : `${leader} is ahead live. Price is catching up to the scoreboard, not the other way around.`,
        );
      }
    } else {
      lines.push(
        clock
          ? `This one is live (${clock}). In-game info hits the tape before the crowd finishes arguing.`
          : `It’s live now. The edge is reacting faster than a pre-game take.`,
      );
    }
    lines.push(
      `${favorite} sits at ${favPct}¢ while the clock is running. Ask whether the tape already priced the last play.`,
    );
  }

  if (changePts != null && Math.abs(changePts) >= 3) {
    lines.push(
      changePts > 0
        ? `${favorite} jumped about ${Math.abs(changePts)} pts in 24h to ${favPct}%. Fade the chase or lean into the momentum.`
        : `${favorite} slipped about ${Math.abs(changePts)} pts in 24h to ${favPct}%. That’s a window if you think the move overshot.`,
    );
  }

  if (hours != null && hours > 0 && hours <= 6) {
    lines.push(
      hours < 1
        ? `Under an hour to close at ${favPct}/${dogPct}. Last looks usually misprice panic and late news.`
        : `About ${Math.max(1, Math.round(hours))}h left and ${favorite} sits at ${favPct}%. Late money still moves these before tip.`,
    );
  }

  if (favPct >= 78) {
    lines.push(
      `${favorite} is a heavy favorite at ${favPct}¢. ${underdog} at ${dogPct}¢ is the asymmetric ticket if you see a path.`,
    );
  } else if (favPct <= 58 && dogPct >= 42) {
    lines.push(
      `Basically a coin flip — ${a} ${yes}¢ / ${b} ${no}¢. Small conviction gets paid if you’re early.`,
    );
  }

  if (vol24 && market.volume24h >= 25_000) {
    lines.push(
      `${vol24} traded in 24h with ${favorite} at ${favPct}%. Liquidity is there — do you agree with the crowd?`,
    );
  }

  if (hours != null && hours > 24 && hours < 72) {
    lines.push(
      `Resolves in roughly ${Math.round(hours / 24)} days. Enough time for news, not enough for the market to stay lazy.`,
    );
  }

  lines.push(
    `${favorite} is ${favPct}¢. Ask whether the public number matches the actual edge.`,
    `Price says ${a} ${yes}¢, ${b} ${no}¢. The bet is which story the next update confirms.`,
    `Someone will be wrong at ${favPct}/${dogPct}. Pick the side where your read is clearer than the tape.`,
  );

  // Dedupe while keeping order; keep a rotating set of 3–5.
  const seen = new Set<string>();
  const unique = lines.filter((line) => {
    if (seen.has(line)) return false;
    seen.add(line);
    return true;
  });
  return unique.slice(0, 5);
}

/**
 * Portfolio-style StreamingWords (fade + rise per word).
 * Unmount while hidden so the first open only mounts once (no double play).
 * Advances after stream + 3s hold and loops.
 */
function RecentInsightsStream({
  sentences,
  active,
}: {
  sentences: string[];
  active: boolean;
}) {
  const [index, setIndex] = useState(0);
  const count = sentences.length;
  const sentence = sentences[index] ?? "";
  const activeRef = useRef(active);
  activeRef.current = active;

  // Keep index at 0 while hidden so the next open mounts once on line 1.
  useEffect(() => {
    if (!active) setIndex(0);
  }, [active]);

  const words = useMemo(() => {
    if (!active || count === 0 || !sentence) return [] as StreamingWord[];
    const delayIndex = { current: 0 };
    const next: StreamingWord[] = [];
    pushTextWords(next, `insight-${index}`, sentence, delayIndex);
    return next;
  }, [active, count, index, sentence]);

  useEffect(() => {
    if (!active || count === 0 || words.length === 0) return;
    const streamMs =
      (Math.max(0, words.length - 1) * WORD_STAGGER + WORD_DURATION) * 1000;
    const id = window.setTimeout(() => {
      if (!activeRef.current) return;
      setIndex((i) => (i + 1) % count);
    }, streamMs + HOLD_MS);
    return () => window.clearTimeout(id);
  }, [active, count, index, words.length]);

  if (!active || count === 0 || words.length === 0) return null;

  return (
    <span aria-live="polite" className="inline">
      <StreamingWords key={index} words={words} />
    </span>
  );
}

/**
 * Transform-based horizontal pages (no overflow-x — that was clipping bubbles
 * and fighting the vertical feed). Trackpad wheel + pointer drag.
 * Page 0: bubbles + trade buttons. Page 1: insight.
 */
const AUTO_SWIPE_MS = 8000;

export default function MarketInsightsPager({
  market,
  enabled,
  autoSwipe = false,
  children,
}: {
  market: PolymarketMarketData;
  enabled: boolean;
  /** Landing / embed: alternate buttons ↔ insights every 8s. */
  autoSwipe?: boolean;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const settleTimerRef = useRef(0);
  const autoPausedUntilRef = useRef(0);
  const dragRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    origin: number;
    axis: "h" | "v" | null;
  } | null>(null);

  const setProgressBoth = useCallback((next: number) => {
    const clamped = Math.min(1, Math.max(0, next));
    progressRef.current = clamped;
    setProgress(clamped);
  }, []);

  const snapTo = useCallback(
    (next: 0 | 1, durationMs = 200) => {
      const root = rootRef.current;
      root?.style.setProperty("--insight-ease", `${durationMs}ms`);
      root?.style.setProperty(
        "--insight-ease-fn",
        durationMs > 300
          ? "cubic-bezier(0.22, 1, 0.36, 1)"
          : "ease-out",
      );
      setProgressBoth(next);
      window.setTimeout(() => {
        root?.style.setProperty("--insight-ease", "0ms");
        root?.style.setProperty("--insight-ease-fn", "ease-out");
      }, durationMs + 40);
    },
    [setProgressBoth],
  );

  useEffect(() => {
    setProgressBoth(0);
  }, [market.marketId, setProgressBoth]);

  // Landing phone: flip sides every 8s (pause briefly after manual input).
  useEffect(() => {
    if (!enabled || !autoSwipe) return;
    const id = window.setInterval(() => {
      if (Date.now() < autoPausedUntilRef.current) return;
      snapTo(progressRef.current < 0.5 ? 1 : 0, 720);
    }, AUTO_SWIPE_MS);
    return () => window.clearInterval(id);
  }, [autoSwipe, enabled, market.marketId, snapTo]);

  useEffect(() => {
    if (!enabled) return;
    const root = rootRef.current;
    if (!root) return;

    const onWheel = (event: WheelEvent) => {
      const rawX = event.shiftKey ? event.deltaY || event.deltaX : event.deltaX;
      const rawY = event.shiftKey ? 0 : event.deltaY;
      // Trackpads often send diagonal deltas — bias toward horizontal here.
      if (Math.abs(rawX) < 1) return;
      if (Math.abs(rawX) < Math.abs(rawY) * 0.45) return;

      event.preventDefault();
      event.stopPropagation();
      autoPausedUntilRef.current = Date.now() + AUTO_SWIPE_MS;

      const width = Math.max(1, root.clientWidth);
      root.style.setProperty("--insight-ease", "0ms");
      setProgressBoth(progressRef.current + rawX / width);

      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = window.setTimeout(() => {
        snapTo(progressRef.current > 0.35 ? 1 : 0);
      }, 100);
    };

    root.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => {
      window.clearTimeout(settleTimerRef.current);
      root.removeEventListener("wheel", onWheel, true);
    };
  }, [enabled, setProgressBoth, snapTo]);

  const pauseAutoSwipe = useCallback(() => {
    autoPausedUntilRef.current = Date.now() + AUTO_SWIPE_MS;
  }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    pauseAutoSwipe();
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      origin: progressRef.current,
      axis: null,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const root = rootRef.current;
    if (!root) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;

    if (!drag.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      drag.axis = Math.abs(dx) > Math.abs(dy) * 1.05 ? "h" : "v";
      if (drag.axis === "h") {
        root.setPointerCapture(event.pointerId);
        root.style.setProperty("--insight-ease", "0ms");
      }
    }
    if (drag.axis !== "h") return;
    event.preventDefault();
    const width = Math.max(1, root.clientWidth);
    // Swipe left → insights.
    setProgressBoth(drag.origin - dx / width);
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    const root = rootRef.current;
    if (root?.hasPointerCapture(event.pointerId)) {
      root.releasePointerCapture(event.pointerId);
    }
    if (drag.axis !== "h") return;
    const dx = event.clientX - drag.x;
    if (Math.abs(dx) > 40) {
      snapTo(dx < 0 ? 1 : 0);
    } else {
      snapTo(progressRef.current > 0.35 ? 1 : 0);
    }
  };

  const sentences = useMemo(
    () => insightSentences(market),
    // Refresh when the market identity or core prices move.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      market.marketId,
      market.yesPrice,
      market.noPrice,
      market.price24hChange,
      market.volume24h,
      market.closesAt,
      market.liveGame?.status,
      market.liveGame?.clock,
    ],
  );
  // Only stream once the swipe has settled on insights (avoids double mount).
  const [streamActive, setStreamActive] = useState(false);
  useEffect(() => {
    if (progress >= 0.98) setStreamActive(true);
    else if (progress <= 0.02) setStreamActive(false);
  }, [progress]);

  if (!enabled) {
    return <div className="relative mt-auto w-full">{children}</div>;
  }

  const onActions = progress < 0.5;
  const actionsOpacity = 1 - progress;
  const insightOpacity = progress;
  const ease = `opacity var(--insight-ease, 0ms) var(--insight-ease-fn, ease-out), transform var(--insight-ease, 0ms) var(--insight-ease-fn, ease-out)`;

  return (
    <div
      ref={rootRef}
      className="relative mt-auto w-full"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div className="relative w-full">
        <div
          className={`relative w-full ${onActions ? "" : "pointer-events-none"}`}
          style={{
            opacity: actionsOpacity,
            transform: `translate3d(${(-progress * 18).toFixed(2)}%, 0, 0)`,
            transition: ease,
            willChange: "opacity, transform",
          }}
          aria-hidden={!onActions}
        >
          {children}
        </div>
        <div
          className={`absolute inset-x-0 bottom-0 flex items-end px-0.5 pb-0.5 ${
            onActions ? "pointer-events-none" : ""
          }`}
          style={{
            opacity: insightOpacity,
            transform: `translate3d(${((1 - progress) * 18).toFixed(2)}%, 0, 0)`,
            transition: ease,
            willChange: "opacity, transform",
          }}
          aria-hidden={onActions}
        >
          <p
            className="text-[26px] font-semibold leading-[1.2] tracking-[-0.025em] text-white"
            aria-label={`Recent insights for ${market.title}`}
          >
            <span className="mb-2 block text-[11px] font-semibold tracking-[0.02em] text-white/45">
              Recent Insights
            </span>
            <RecentInsightsStream
              sentences={sentences}
              active={streamActive}
            />
          </p>
        </div>
      </div>

      <div
        className="mt-2.5 flex items-center justify-center gap-1.5"
        role="tablist"
        aria-label="Trade actions or insight"
      >
        <button
          type="button"
          role="tab"
          aria-selected={onActions}
          aria-label="Trade buttons"
          onClick={(event) => {
            event.stopPropagation();
            pauseAutoSwipe();
            snapTo(0);
          }}
          className={`h-1.5 rounded-full transition-all ${
            onActions ? "w-4 bg-white" : "w-1.5 bg-white/40"
          }`}
        />
        <button
          type="button"
          role="tab"
          aria-selected={!onActions}
          aria-label="Insight"
          onClick={(event) => {
            event.stopPropagation();
            pauseAutoSwipe();
            snapTo(1);
          }}
          className={`h-1.5 rounded-full transition-all ${
            !onActions ? "w-4 bg-white" : "w-1.5 bg-white/40"
          }`}
        />
      </div>
    </div>
  );
}
