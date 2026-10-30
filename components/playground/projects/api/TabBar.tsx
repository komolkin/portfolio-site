"use client";

import { useEffect, useState, type ReactNode } from "react";
import { LiquidGlass } from "simple-liquid-glass";

export type TabId = "explore" | "search" | "positions" | "feed" | "rewards";

const TABS: readonly { id: TabId; label: string }[] = [
  { id: "explore", label: "Home" },
  { id: "search", label: "Search" },
  { id: "positions", label: "Positions" },
  { id: "feed", label: "Pulse" },
  { id: "rewards", label: "Rewards" },
];

/** Matches Figma Navigation — Main sections (node 5436:9157). */
const GLASS_BORDER = "rgba(255, 255, 255, 0.28)";
const GLASS_COLOR = "rgba(0, 0, 0, 0.55)";
const RADIUS = 28;
export const TAB_BAR_HEIGHT = 56;
export const TAB_BAR_BOTTOM = 20;
/** Space reserved under feed cards so actions clear the floating tab bar. */
export const TAB_BAR_CONTENT_INSET = TAB_BAR_HEIGHT + TAB_BAR_BOTTOM + 12;

function HomeTabIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[28px] w-[28px]" aria-hidden>
      {active ? (
        <path
          d="M4.5 10.8 12 4.5l7.5 6.3V19a1.5 1.5 0 0 1-1.5 1.5h-4.2v-5.2h-3.6V20.5H6A1.5 1.5 0 0 1 4.5 19V10.8Z"
          fill="currentColor"
        />
      ) : (
        <path
          d="M5 11.1 12 5.2l7 5.9V19a1.2 1.2 0 0 1-1.2 1.2h-3.6v-5h-4.4v5H6.2A1.2 1.2 0 0 1 5 19v-7.9Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

export function SearchTabIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[28px] w-[28px]" aria-hidden>
      {active ? (
        <>
          <circle cx="11" cy="11" r="7" fill="currentColor" opacity="0.2" />
          <circle
            cx="11"
            cy="11"
            r="7"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M20 20L16.5 16.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <circle
            cx="11"
            cy="11"
            r="7"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="M20 20L16.5 16.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

function PulseTabIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[28px] w-[28px]" aria-hidden>
      {active ? (
        <>
          <circle cx="12" cy="12" r="2.4" fill="currentColor" />
          <path
            d="M8.2 8.2a5.4 5.4 0 0 0 0 7.6M15.8 8.2a5.4 5.4 0 0 1 0 7.6"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
          <path
            d="M5.4 5.4a9.3 9.3 0 0 0 0 13.2M18.6 5.4a9.3 9.3 0 0 1 0 13.2"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="2.1" stroke="currentColor" strokeWidth="1.7" />
          <path
            d="M8.3 8.3a5.2 5.2 0 0 0 0 7.4M15.7 8.3a5.2 5.2 0 0 1 0 7.4"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <path
            d="M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

/** Airdrop — dome canopy, shrouds, crate. */
function AirdropTabIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[28px] w-[28px]" aria-hidden>
      {active ? (
        <>
          <path
            d="M3.5 11.5C4.35 5.6 7.6 2.9 12 2.9s7.65 2.7 8.5 8.6H3.5Z"
            fill="currentColor"
          />
          {/* Shrouds stop at crate top so they don't ghost through the box. */}
          <path
            d="M6.4 11.5 9.9 15.2M17.6 11.5 14.1 15.2M12 11.5v3.7"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect
            x="8.4"
            y="15.15"
            width="7.2"
            height="5.35"
            rx="1.45"
            fill="currentColor"
          />
        </>
      ) : (
        <>
          <path
            d="M3.5 11.5C4.35 5.6 7.6 2.9 12 2.9s7.65 2.7 8.5 8.6"
            stroke="currentColor"
            strokeWidth="1.65"
            strokeLinecap="round"
          />
          {/* Canopy chord — horizontal line where the wires attach. */}
          <path
            d="M3.5 11.5h17"
            stroke="currentColor"
            strokeWidth="1.65"
            strokeLinecap="round"
          />
          <path
            d="M6.4 11.5 9.9 15.2M17.6 11.5 14.1 15.2M12 11.5v3.7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect
            x="8.4"
            y="15.15"
            width="7.2"
            height="5.35"
            rx="1.45"
            stroke="currentColor"
            strokeWidth="1.65"
          />
        </>
      )}
    </svg>
  );
}

function PositionsTabCount({
  count,
  active,
  pnlUsd,
}: {
  count: number;
  active: boolean;
  pnlUsd: number;
  investedUsd: number;
}) {
  const hasPositions = count > 0;
  const mode =
    !hasPositions || Math.abs(pnlUsd) < 0.01
      ? "flat"
      : pnlUsd > 0
        ? "up"
        : "down";

  const toneClass =
    mode === "up"
      ? active
        ? "bg-[#1f8f45]/50"
        : "bg-[#1f8f45]/32"
      : mode === "down"
        ? active
          ? "bg-[#c44a52]/45"
          : "bg-[#c44a52]/28"
        : active
          ? "bg-white/25"
          : "bg-white/[0.12]";

  return (
    <span
      className={`relative isolate flex h-8 min-w-[36px] items-center justify-center overflow-hidden rounded-[10px] px-2.5 text-[15px] font-semibold tabular-nums ${
        active ? "text-white" : "text-white/80"
      }`}
    >
      <span
        aria-hidden
        className={`absolute inset-0 rounded-[inherit] ${toneClass}`}
      />
      {mode === "up" ? (
        <span
          aria-hidden
          className="api-positions-up-glow pointer-events-none absolute inset-[-40%] rounded-full bg-[#3db86a] blur-[10px]"
        />
      ) : null}
      {mode === "down" ? (
        <span
          aria-hidden
          className="api-positions-down-glow pointer-events-none absolute inset-[-40%] rounded-full bg-[#ff4d5e] blur-[10px]"
        />
      ) : null}
      <span className="relative z-[1]">{count}</span>
    </span>
  );
}

function TabIcon({ id, active }: { id: TabId; active: boolean }) {
  switch (id) {
    case "explore":
      return <HomeTabIcon active={active} />;
    case "search":
      return <SearchTabIcon active={active} />;
    case "positions":
      return null;
    case "feed":
      return <PulseTabIcon active={active} />;
    case "rewards":
      return <AirdropTabIcon active={active} />;
  }
}

function TabBarGlass({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [reducedTransparency, setReducedTransparency] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setMounted(true);
    const transparency = window.matchMedia(
      "(prefers-reduced-transparency: reduce)",
    );
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateTransparency = () => setReducedTransparency(transparency.matches);
    const updateMotion = () => setReducedMotion(motion.matches);
    updateTransparency();
    updateMotion();
    transparency.addEventListener("change", updateTransparency);
    motion.addEventListener("change", updateMotion);
    return () => {
      transparency.removeEventListener("change", updateTransparency);
      motion.removeEventListener("change", updateMotion);
    };
  }, []);

  if (!mounted || reducedTransparency) {
    return (
      <div
        className="relative w-full overflow-hidden rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.45)]"
        style={{
          height: TAB_BAR_HEIGHT,
          ...(reducedTransparency
            ? { background: "rgba(12, 12, 14, 0.94)" }
            : {
                background: "rgba(0, 0, 0, 0.58)",
                backdropFilter: "blur(18px) saturate(140%)",
                WebkitBackdropFilter: "blur(18px) saturate(140%)",
              }),
        }}
      >
        {children}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background:
              "linear-gradient(-10deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 30%, rgba(120,120,120,0) 70%, rgba(255,255,255,0.28) 100%) border-box",
            mask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
            WebkitMask:
              "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
            maskComposite: "exclude",
            WebkitMaskComposite: "xor",
            border: "1px solid transparent",
          }}
        />
      </div>
    );
  }

  return (
    <LiquidGlass
      mode="preset"
      radius={RADIUS}
      frost={0.35}
      blur={3.5}
      glassColor={GLASS_COLOR}
      borderColor={GLASS_BORDER}
      lens="rim"
      lensStrength={1.15}
      quality="high"
      liquid={reducedMotion ? false : "flow"}
      liquidSpeed={0.55}
      liquidScale={10}
      className="w-full overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.45)]"
      style={{ width: "100%", height: TAB_BAR_HEIGHT }}
    >
      {children}
    </LiquidGlass>
  );
}

export type TabBarProps = {
  /** `null` when a non-tab screen (e.g. own profile) is open. */
  activeTab: TabId | null;
  onChange: (id: TabId) => void;
  positionCount: number;
  positionsPnl: number;
  positionsInvested: number;
  /** Shrink when the explore feed scrolls past the hero. */
  compact?: boolean;
  /** Slide off-screen (e.g. own profile). */
  hidden?: boolean;
};

export default function TabBar({
  activeTab,
  onChange,
  positionCount,
  positionsPnl,
  positionsInvested,
  compact = false,
  hidden = false,
}: TabBarProps) {
  const activeIndex = TABS.findIndex((tab) => tab.id === activeTab);
  const hasActiveTab = activeIndex >= 0;

  return (
    <nav
      className="pointer-events-none absolute inset-x-0 z-10 flex justify-center px-5 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
      style={{
        bottom: TAB_BAR_BOTTOM,
        transform: [
          hidden
            ? `translateY(${TAB_BAR_HEIGHT + TAB_BAR_BOTTOM + 28}px)`
            : "translateY(0)",
          compact && !hidden ? "scale(0.86)" : "scale(1)",
        ].join(" "),
        transformOrigin: "center bottom",
      }}
      aria-label="Main sections"
      aria-hidden={hidden}
    >
      <div
        className={`w-full max-w-[360px] ${hidden ? "pointer-events-none" : "pointer-events-auto"}`}
      >
        <TabBarGlass>
          <div
            className="relative flex h-full w-full items-center justify-between px-1.5"
            role="tablist"
          >
            <div
              aria-hidden
              className="absolute top-1.5 bottom-1.5 left-1.5 w-[calc((100%-12px)/var(--tab-count))] rounded-full bg-white/20 transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
              style={{
                ["--tab-count" as string]: TABS.length,
                opacity: hasActiveTab ? 1 : 0,
                transform: `translateX(calc(${Math.max(0, activeIndex)} * 100%))`,
              }}
            />
            {TABS.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-label={
                    tab.id === "positions"
                      ? `Positions, ${positionCount} open`
                      : tab.label
                  }
                  aria-selected={isActive}
                  onClick={() => onChange(tab.id)}
                  className={`relative z-10 flex h-11 min-w-0 flex-1 items-center justify-center rounded-full transition-colors duration-300 ${
                    isActive
                      ? "text-white"
                      : "text-white/45 hover:text-white/70"
                  }`}
                >
                  {tab.id === "positions" ? (
                    <PositionsTabCount
                      count={positionCount}
                      active={isActive}
                      pnlUsd={positionsPnl}
                      investedUsd={positionsInvested}
                    />
                  ) : (
                    <TabIcon id={tab.id} active={isActive} />
                  )}
                </button>
              );
            })}
          </div>
        </TabBarGlass>
      </div>
    </nav>
  );
}
