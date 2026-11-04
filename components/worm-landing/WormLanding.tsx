"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type MouseEvent,
  type RefObject,
} from "react";
import { instrumentSans } from "@/lib/fonts";
import AquaButton from "@/components/worm-app/AquaButton";

const ApiApp = dynamic(
  () => import("@/components/playground/projects/api/Api"),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-[#0c0c0d]" aria-hidden />,
  },
);

const APP_HREF = "/1";
const PRESS =
  "transition-transform duration-150 ease-out active:scale-[0.97]";
/** Temporarily hide the product feature grid on /app. */
const SHOW_PRODUCT_SECTION = false;
const ALL_NAV_IDS = ["product"] as const;
type NavId = (typeof ALL_NAV_IDS)[number];
const NAV_IDS = ALL_NAV_IDS.filter(
  (id) => SHOW_PRODUCT_SECTION || id !== "product",
);
const TITLE_WORDS = ["follow", "share", "earn", "copy"] as const;

/** Four product beats — one screen on /app. */
const PRODUCT_BEATS = [
  { id: "markets", title: "A short slate, mostly sports.", tone: "light" },
  { id: "leaderboard", title: "Find who is right.", tone: "light" },
  {
    id: "feed",
    title: "A take on the way in, and on the way out.",
    tone: "light",
  },
  { id: "copy", title: "Same trade. Your size.", tone: "dark" },
] as const;

/** Same glyphs as the API onboarding physics pile. */
const CLOSING_ELEMENT_VISUALS = [
  "/worm-app/physics/logo-w.png",
  "/worm-app/physics/piece-football.png",
  "/worm-app/physics/piece-alien.png",
  "/worm-app/physics/piece-gold-e.png",
  "/worm-app/physics/piece-tennis.png",
  "/worm-app/physics/piece-golf.png",
  "/worm-app/physics/piece-flag-r.png",
  "/worm-app/physics/piece-marble-n.png",
  "/worm-app/physics/piece-arrow.png",
  "/worm-app/physics/piece-crystal-a.png",
  "/worm-app/physics/piece-cash.png",
  "/worm-app/physics/piece-soccer.png",
] as const;

function buildClosingLogoPool(): string[] {
  // Duplicate so reshuffles can fill every fixed slot.
  return [...CLOSING_ELEMENT_VISUALS, ...CLOSING_ELEMENT_VISUALS];
}

/** Fixed slots around the title — keep the center clear for copy + CTA. */
const CLOSING_LOGO_SLOTS = [
  { x: 6, y: 10, size: 72, rotate: -12 },
  { x: 18, y: 28, size: 58, rotate: 8 },
  { x: 4, y: 48, size: 64, rotate: -4 },
  { x: 14, y: 68, size: 56, rotate: 14 },
  { x: 8, y: 86, size: 62, rotate: -9 },
  { x: 88, y: 12, size: 68, rotate: 10 },
  { x: 78, y: 30, size: 56, rotate: -7 },
  { x: 92, y: 46, size: 62, rotate: 6 },
  { x: 80, y: 64, size: 64, rotate: -11 },
  { x: 90, y: 84, size: 58, rotate: 9 },
  { x: 28, y: 6, size: 54, rotate: -6 },
  { x: 68, y: 8, size: 54, rotate: 5 },
  { x: 32, y: 90, size: 56, rotate: 8 },
  { x: 64, y: 88, size: 58, rotate: -8 },
] as const;

const MARKETS = [
  {
    title: "Lakers vs. Celtics",
    meta: "Live · Q3 8:42",
    pick: "Lakers",
    price: "54¢",
    live: true,
    logos: [
      "https://a.espncdn.com/i/teamlogos/nba/500/lal.png",
      "https://a.espncdn.com/i/teamlogos/nba/500/bos.png",
    ],
  },
  {
    title: "Man City vs. Arsenal",
    meta: "Today",
    pick: "Man City",
    price: "61¢",
    live: false,
    logos: [
      "https://a.espncdn.com/i/teamlogos/soccer/500/382.png",
      "https://a.espncdn.com/i/teamlogos/soccer/500/359.png",
    ],
  },
  {
    title: "Verstappen vs. Norris",
    meta: "Australian GP",
    pick: "Verstappen",
    price: "58¢",
    live: false,
    logos: [
      "https://a.espncdn.com/i/headshots/rpm/players/full/4665.png",
      "https://a.espncdn.com/i/headshots/rpm/players/full/5579.png",
    ],
  },
  {
    title: "Rays vs. Brewers",
    meta: "Tonight",
    pick: "Brewers",
    price: "52¢",
    live: false,
    logos: [
      "https://a.espncdn.com/i/teamlogos/mlb/500/tb.png",
      "https://a.espncdn.com/i/teamlogos/mlb/500/mil.png",
    ],
  },
] as const;

const PERIODS = ["24h", "Week", "Month"] as const;
type Period = (typeof PERIODS)[number];

const BOARDS: Record<
  Period,
  { name: string; market: string; pnl: number }[]
> = {
  "24h": [
    { name: "mira", market: "Lakers", pnl: 1840 },
    { name: "cole", market: "Verstappen", pnl: 960 },
    { name: "nia", market: "Man City", pnl: 640 },
    { name: "jules", market: "Brewers", pnl: -180 },
    { name: "reed", market: "Celtics", pnl: -420 },
  ],
  Week: [
    { name: "cole", market: "Verstappen", pnl: 6420 },
    { name: "mira", market: "Lakers", pnl: 4180 },
    { name: "nia", market: "Man City", pnl: 2210 },
    { name: "jules", market: "Rays", pnl: 860 },
    { name: "reed", market: "Celtics", pnl: 410 },
  ],
  Month: [
    { name: "nia", market: "Man City", pnl: 18420 },
    { name: "cole", market: "Verstappen", pnl: 12110 },
    { name: "mira", market: "Lakers", pnl: 9640 },
    { name: "jules", market: "Brewers", pnl: 2400 },
    { name: "reed", market: "Celtics", pnl: 1280 },
  ],
};

/** Same gold / silver / bronze rank chips as the in-app leaderboard. */
const RANK_MEDALS: Record<number, { face: string; text: string }> = {
  1: {
    face: "radial-gradient(circle at 35% 30%, #f7d77a 0%, #d9a73a 55%, #a87a1f 100%)",
    text: "#4a3308",
  },
  2: {
    face: "radial-gradient(circle at 35% 30%, #d8d8dc 0%, #9a9aa0 55%, #6c6c72 100%)",
    text: "#2a2a2e",
  },
  3: {
    face: "radial-gradient(circle at 35% 30%, #e7a77a 0%, #b8703f 55%, #864a22 100%)",
    text: "#3b1e0b",
  },
};

function RankBadge({ rank }: { rank: number }) {
  const medal = RANK_MEDALS[rank];
  if (!medal) {
    return (
      <span className="w-6 text-center text-[13px] font-semibold tabular-nums text-[#5e5c56]">
        {rank}
      </span>
    );
  }
  return (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold tabular-nums shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_1px_rgba(0,0,0,0.25),0_1px_2px_rgba(0,0,0,0.18)]"
      style={{ background: medal.face, color: medal.text }}
      aria-label={`Rank ${rank}`}
    >
      {rank}
    </span>
  );
}

const FAQS = [
  {
    q: "What is Worm?",
    a: "Worm is a social prediction app. You trade a curated list of markets, mostly sports, and you do it next to other traders — follow them, copy them, or answer their takes in the feed.",
  },
  {
    q: "How can I join?",
    a: "Worm is invite-only. Follow all the Worm social accounts — we can randomly share the codes there.",
  },
  {
    q: "What can I trade?",
    a: "A short slate. Most markets are sports — a game, a race, a matchup — chosen so the board stays readable.",
  },
  {
    q: "How do I find traders?",
    a: "On the leaderboard. It ranks traders over 24 hours, a week, or a month. From there you follow someone, or copy their next trade.",
  },
  {
    q: "What is a take?",
    a: "A short note you can leave when you open a position or cash out. Takes show up in the feed, and other people can comment on them.",
  },
  {
    q: "What happens when I copy someone?",
    a: "You set your own size — a fixed amount, or a percent of theirs. You can copy the exit too. Their trade is the signal. The position is yours.",
  },
] as const;

function money(value: number) {
  const formatted = Math.abs(value).toLocaleString("en-US");
  return value < 0 ? `−$${formatted}` : `+$${formatted}`;
}

function CopyShowcaseCard() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative w-full" style={{ perspective: 1200 }}>
      <motion.div
        className="worm-copy-showcase relative rounded-[24px] bg-[#1c1c1f] p-5 text-white shadow-[0_24px_60px_-28px_rgba(0,0,0,0.7)] ring-1 ring-white/10 sm:p-6"
        style={{
          transformStyle: "preserve-3d",
          transformOrigin: "50% 50%",
        }}
        animate={
          reduceMotion
            ? undefined
            : {
                rotateX: [5, -4, 3, 5],
                rotateY: [-8, 7, -5, -8],
                y: [0, -8, -3, 0],
              }
        }
        transition={
          reduceMotion
            ? undefined
            : {
                duration: 9,
                repeat: Infinity,
                ease: "easeInOut",
              }
        }
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[24px]"
        >
          <motion.div
            className="absolute -left-1/4 -top-1/3 h-[140%] w-[70%] rotate-12 bg-gradient-to-br from-white/[0.14] via-white/[0.03] to-transparent"
            animate={
              reduceMotion
                ? undefined
                : { x: ["-8%", "28%", "-8%"], opacity: [0.55, 0.85, 0.55] }
            }
            transition={
              reduceMotion
                ? undefined
                : { duration: 9, repeat: Infinity, ease: "easeInOut" }
            }
          />
        </div>
        <div className="relative">
          <p className="text-[13px] text-white/50">Copying cole</p>
          <p
            className={`mt-2 text-[44px] font-semibold leading-none tracking-[-0.04em] sm:text-[48px] ${instrumentSans.className}`}
          >
            $25
          </p>
          <p className="mt-1.5 text-[14px] text-white/55">per trade</p>
          <dl className="mt-6 divide-y divide-white/10 text-[14px]">
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-white/55">Size</dt>
              <dd className="font-semibold">Fixed</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-white/55">Copy exits</dt>
              <dd className="font-semibold text-[#00D54B]">On</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-white/55">Max a day</dt>
              <dd className="font-semibold">$200</dd>
            </div>
          </dl>
        </div>
      </motion.div>
    </div>
  );
}

const NAV = (
  [{ id: "product", label: "Product" }] as const satisfies readonly {
    id: NavId;
    label: string;
  }[]
).filter((item) => SHOW_PRODUCT_SECTION || item.id !== "product");

function scrollToId(
  root: HTMLElement,
  id: string,
  headerOffset: number,
) {
  const el = root.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
  if (!el) return;
  const top =
    root.scrollTop +
    el.getBoundingClientRect().top -
    root.getBoundingClientRect().top -
    headerOffset;
  root.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

function AppleMark() {
  return (
    <svg viewBox="0 0 16 20" className="h-[18px] w-[15px]" fill="currentColor" aria-hidden>
      <path d="M13.2 10.5c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.8-3.5.8s-1.8-.8-3-.8c-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.3 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7 2-.1 2.9-2.2c.7-1 1.2-2.1 1.5-3.2-3.9-1.5-3.8-5.5-3.8-5.4zM10.9 3.8c.6-.8 1.1-1.9.9-3-.9.1-2 .6-2.6 1.4-.6.7-1.1 1.8-.9 2.9 1 .1 2-.5 2.6-1.3z" />
    </svg>
  );
}

const SUPPORT_EMAIL = "support@worm.app";

function FooterSupport() {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(SUPPORT_EMAIL);
        } catch {
          // Ignore clipboard failures in unsupported environments.
        }
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }}
      className={`rounded-full transition-opacity hover:text-[#141416] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#141416] ${PRESS}`}
    >
      {copied ? "Email Copied" : "Support"}
    </button>
  );
}

function EarlyAccess({
  onOpen,
  size = "default",
}: {
  onOpen: () => void;
  size?: "default" | "nav";
}) {
  const sizeClass =
    size === "nav"
      ? "h-10 gap-2 pl-3.5 pr-4 text-[14px]"
      : "h-[52px] gap-2.5 pl-5 pr-6 text-[17px]";
  return (
    <AquaButton
      variant="secondary"
      onClick={onOpen}
      className={`shrink-0 tracking-[-0.015em] ${sizeClass}`}
    >
      <AppleMark />
      Early Access on iOS
    </AquaButton>
  );
}

function NavLinks({
  activeNav,
  onNavClick,
}: {
  activeNav: NavId | null;
  onNavClick: (event: MouseEvent<HTMLAnchorElement>, id: NavId) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState({ left: 0, width: 0, ready: false });

  const measure = useCallback(() => {
    const list = listRef.current;
    if (!list || !activeNav) {
      setPill((prev) => ({ ...prev, ready: false }));
      return;
    }
    const link = list.querySelector<HTMLElement>(`[data-nav-id="${activeNav}"]`);
    if (!link) {
      setPill((prev) => ({ ...prev, ready: false }));
      return;
    }
    setPill({
      left: link.offsetLeft,
      width: link.offsetWidth,
      ready: true,
    });
  }, [activeNav]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(onResize)
        : null;
    ro?.observe(list);
    return () => {
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
    };
  }, [measure]);

  const visible = Boolean(activeNav && pill.ready);

  return (
    <div ref={listRef} className="relative flex items-center gap-1">
      <motion.span
        aria-hidden
        className="pointer-events-none absolute top-0 bottom-0 rounded-full bg-black/[0.06]"
        initial={false}
        animate={{
          left: pill.left,
          width: Math.max(pill.width, 1),
          opacity: visible ? 1 : 0,
          scale: visible ? 1 : 0.92,
        }}
        transition={{
          left: { type: "spring", stiffness: 420, damping: 36, mass: 0.7 },
          width: { type: "spring", stiffness: 420, damping: 36, mass: 0.7 },
          opacity: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
          scale: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
        }}
      />
      {NAV.map((item) => {
        const active = activeNav === item.id;
        return (
          <a
            key={item.id}
            data-nav-id={item.id}
            href={`#${item.id}`}
            aria-current={active ? "true" : undefined}
            onClick={(event) => onNavClick(event, item.id)}
            className={`relative z-[1] shrink-0 rounded-full px-3.5 py-1.5 whitespace-nowrap transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141416] ${PRESS} ${
              active ? "text-[#141416]" : "text-[#5e5c56] hover:text-[#141416]"
            }`}
          >
            {item.label}
          </a>
        );
      })}
    </div>
  );
}

function CloseMark() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <path
        d="M3.5 3.5l9 9M12.5 3.5l-9 9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DownloadModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const titleId = useId();
  const [appUrl, setAppUrl] = useState(APP_HREF);

  useEffect(() => {
    if (!open) return;
    setAppUrl(`${window.location.origin}${APP_HREF}`);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=12&data=${encodeURIComponent(appUrl)}`;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="download-backdrop"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-5"
          onClick={onClose}
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative w-full max-w-[400px] rounded-[36px] bg-white px-8 pb-10 pt-12 text-center shadow-[0_40px_100px_-28px_rgba(0,0,0,0.45)]"
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className={`absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-[#efefef] text-[#141416] hover:bg-[#e6e6e6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141416] ${PRESS}`}
            >
              <CloseMark />
            </button>

            <h2
              id={titleId}
              className="mx-auto max-w-[280px] text-balance text-[28px] font-semibold leading-[1.15] tracking-[-0.035em] text-[#141416]"
            >
              Scan the QR code to download the app on iOS.
            </h2>

            <div className="relative mx-auto mt-8 flex h-[248px] w-[248px] items-center justify-center rounded-[28px] bg-white ring-1 ring-black/[0.08]">
              <img
                src={qrSrc}
                alt={`QR code linking to ${appUrl}`}
                width={220}
                height={220}
                className="h-[220px] w-[220px]"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 m-auto flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#141416] shadow-[0_0_0_6px_white]"
              >
                <img
                  src="/worm/logo-mark.png"
                  alt=""
                  width={28}
                  height={28}
                  className="h-7 w-7 object-contain brightness-0 invert"
                />
              </span>
            </div>

            <p className="mt-7 text-[15px] text-[#5e5c56]">
              For Desktop experience go to{" "}
              <a
                href="https://worm.wtf"
                target="_blank"
                rel="noreferrer"
                className={`font-medium text-[#141416] underline underline-offset-4 hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#141416] ${PRESS}`}
              >
                worm.wtf
              </a>
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function Phone() {
  return (
    <div className="mx-auto w-[min(318px,74vw)] sm:w-[min(348px,54vw)]">
      {/* Full device — tall enough that the bottom sits just past the first viewport. */}
      <div
        className="mx-auto h-[calc(100svh-8.5rem)] max-h-[760px] min-h-[560px] w-full rounded-[48px] p-[6px] sm:rounded-[52px] md:h-[calc(100svh-9.5rem)] md:rounded-[56px] md:p-[6.5px]"
        style={{
          backgroundImage:
            "linear-gradient(145deg, #c8c8cc 0%, #6a6a70 14%, #2a2a2e 32%, #141416 48%, #1c1c1f 62%, #5a5a60 82%, #b8b8be 100%)",
        }}
      >
        <div className="relative h-full w-full overflow-hidden rounded-[42px] bg-[#0c0c0d] sm:rounded-[46px] md:rounded-[50px] ring-1 ring-black/50">
          <div
            className="pointer-events-none absolute left-1/2 top-2.5 z-20 h-7 w-[88px] -translate-x-1/2 rounded-full bg-black md:w-[96px]"
            aria-hidden
          />
          <div className="absolute inset-0 overflow-hidden">
            <ApiApp embed />
            {/* Keep landing scroll free — app UI is preview-only here. */}
            <div className="absolute inset-0 z-30" aria-hidden />
          </div>
        </div>
      </div>
    </div>
  );
}

const TITLE_EASE = [0.16, 1, 0.3, 1] as const;

const letterVariants = {
  initial: { y: "110%" },
  animate: { y: "0%" },
  exit: { y: "-110%" },
};

function WordLetters({
  value,
  className = "",
  ...rest
}: {
  value: string;
  className?: string;
} & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={`inline-flex whitespace-nowrap ${className}`} {...rest}>
      {value.split("").map((letter, letterIndex) => (
        <span key={`${value}-${letterIndex}`} className="inline-block">
          {letter}
        </span>
      ))}
    </span>
  );
}

function shuffleInPlace<T>(items: T[], rand: () => number): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
  return items;
}

function ClosingLogoField({
  scrollRoot,
}: {
  scrollRoot: RefObject<HTMLElement | null>;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [tokens, setTokens] = useState<
    { src: string; delay: number; key: string; bob: number; drift: number }[]
  >([]);

  const reshuffle = useCallback(() => {
    const pool = buildClosingLogoPool();
    const rand = () => Math.random();
    const picks = shuffleInPlace([...pool], rand).slice(
      0,
      CLOSING_LOGO_SLOTS.length,
    );
    setTokens(
      picks.map((src, index) => ({
        src,
        key: `${src}-${index}-${Math.floor(rand() * 1e6)}`,
        delay: 0.04 + rand() * 0.55,
        // Stagger float period / amplitude so the field feels alive, not synced.
        bob: 3.6 + rand() * 2.4,
        drift: 5 + rand() * 5,
      })),
    );
  }, []);

  useEffect(() => {
    reshuffle();
  }, [reshuffle]);

  useEffect(() => {
    const el = rootRef.current;
    const root = scrollRoot.current;
    if (!el || !root) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.28) {
          setVisible(true);
          return;
        }
        if (!entry.isIntersecting) {
          setVisible(false);
          reshuffle();
        }
      },
      {
        root,
        threshold: [0, 0.2, 0.28, 0.45],
        rootMargin: "0px 0px -8% 0px",
      },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [scrollRoot, reshuffle]);

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-visible"
    >
      {tokens.map((token, index) => {
        const slot = CLOSING_LOGO_SLOTS[index];
        if (!slot) return null;
        return (
          <motion.div
            key={token.key}
            className="absolute"
            style={{
              left: `${slot.x}%`,
              top: `${slot.y}%`,
              width: slot.size,
              height: slot.size,
              marginLeft: -slot.size / 2,
              marginTop: -slot.size / 2,
            }}
            initial={false}
            animate={
              visible
                ? {
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    filter: "blur(0px)",
                  }
                : {
                    opacity: 0,
                    scale: 0.55,
                    y: 18,
                    filter: "blur(6px)",
                  }
            }
            transition={{
              duration: 0.7,
              delay: visible ? token.delay : 0,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <motion.img
              src={token.src}
              alt=""
              width={slot.size}
              height={slot.size}
              draggable={false}
              className="h-full w-full object-contain select-none"
              initial={false}
              animate={
                visible && !reduceMotion
                  ? {
                      y: [0, -token.drift, 0],
                      rotate: [
                        slot.rotate,
                        slot.rotate + 2.5,
                        slot.rotate - 1.8,
                        slot.rotate,
                      ],
                    }
                  : { y: 0, rotate: slot.rotate }
              }
              transition={
                visible && !reduceMotion
                  ? {
                      y: {
                        duration: token.bob,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: token.delay + 0.65,
                      },
                      rotate: {
                        duration: token.bob * 1.15,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: token.delay + 0.65,
                      },
                    }
                  : { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
              }
            />
          </motion.div>
        );
      })}
    </div>
  );
}

function RotatingTitle({
  as: Tag = "h1",
  className = "",
}: {
  as?: "h1" | "h2";
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState<number | "auto">("auto");
  const measureRef = useRef<HTMLSpanElement>(null);
  const word = TITLE_WORDS[index];
  const letters = word.split("");

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % TITLE_WORDS.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, []);

  useLayoutEffect(() => {
    const root = measureRef.current;
    if (!root) return;
    const el = root.querySelector<HTMLElement>(`[data-word="${word}"]`);
    if (!el) return;
    const next = Math.ceil(el.getBoundingClientRect().width) + 12;
    let shrinkTimer = 0;
    setWidth((prev) => {
      if (typeof prev !== "number" || next >= prev) return next;
      shrinkTimer = window.setTimeout(() => setWidth(next), 560);
      return prev;
    });
    return () => {
      if (shrinkTimer) window.clearTimeout(shrinkTimer);
    };
  }, [word]);

  return (
    <Tag
      className={`text-balance text-[clamp(44px,7vw,76px)] font-medium leading-[0.98] tracking-[-0.045em] ${className}`}
    >
      <span className="block text-[#8a8882]">Social prediction app</span>
      <span className="block">
        <span className="text-[#8a8882]">for you to </span>
        <motion.span
          className="inline-grid overflow-hidden align-baseline leading-[inherit] text-[#141416]"
          initial={false}
          animate={{ width }}
          transition={{ duration: 0.6, ease: TITLE_EASE }}
          aria-label={word}
        >
          {/* In-flow sizer: owns the line box + baseline. */}
          <WordLetters
            value="follow"
            className="invisible col-start-1 row-start-1"
            aria-hidden
          />
          <span
            ref={measureRef}
            className="pointer-events-none invisible absolute left-0 top-0"
            aria-hidden
          >
            {TITLE_WORDS.map((item) => (
              <span
                key={item}
                data-word={item}
                className="absolute left-0 top-0"
              >
                <WordLetters value={item} />
              </span>
            ))}
          </span>
          {/* Same grid cell as sizer; top-left matches the invisible word. */}
          <span className="relative col-start-1 row-start-1 overflow-hidden">
            <AnimatePresence initial={false}>
              <motion.span
                key={word}
                className="absolute left-0 top-0 inline-flex will-change-transform"
                initial="initial"
                animate="animate"
                exit="exit"
                variants={{
                  initial: {},
                  animate: {
                    transition: {
                      staggerChildren: 0.028,
                      delayChildren: 0.02,
                    },
                  },
                  exit: {
                    transition: {
                      staggerChildren: 0.022,
                      staggerDirection: -1,
                    },
                  },
                }}
              >
                {letters.map((letter, letterIndex) => (
                  <motion.span
                    key={`${word}-${letterIndex}`}
                    variants={letterVariants}
                    transition={{ duration: 0.52, ease: TITLE_EASE }}
                    className="inline-block leading-[inherit]"
                  >
                    {letter}
                  </motion.span>
                ))}
              </motion.span>
            </AnimatePresence>
          </span>
        </motion.span>
      </span>
    </Tag>
  );
}

function MarketsCard() {
  return (
    <ul className="divide-y divide-black/[0.06] overflow-hidden rounded-[24px] bg-white shadow-[0_22px_50px_-28px_rgba(0,0,0,0.4)]">
      {MARKETS.map((market) => (
        <li
          key={market.title}
          className="flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-3.5"
        >
          <span className="flex shrink-0 -space-x-2">
            {market.logos.map((src) => (
              <img
                key={src}
                src={src}
                alt=""
                width={36}
                height={36}
                className="h-9 w-9 rounded-full bg-[#f6f5f2] object-contain p-0.5 ring-2 ring-white"
              />
            ))}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold">
              {market.title}
            </span>
            <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-[#5e5c56]">
              {market.live && (
                <span className="h-1.5 w-1.5 rounded-full bg-[#00D54B]" />
              )}
              {market.meta}
            </span>
          </span>
          <span className="text-right">
            <span className="block text-[13px] text-[#5e5c56]">{market.pick}</span>
            <span
              className={`block text-[18px] font-semibold leading-none ${instrumentSans.className}`}
            >
              {market.price}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function PeriodTabs({
  period,
  onPeriodChange,
}: {
  period: Period;
  onPeriodChange: (period: Period) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState({ left: 0, width: 0, ready: false });

  const measure = useCallback(() => {
    const list = listRef.current;
    if (!list) {
      setPill((prev) => ({ ...prev, ready: false }));
      return;
    }
    const button = list.querySelector<HTMLElement>(
      `[data-period="${period}"]`,
    );
    if (!button) {
      setPill((prev) => ({ ...prev, ready: false }));
      return;
    }
    setPill({
      left: button.offsetLeft,
      width: button.offsetWidth,
      ready: true,
    });
  }, [period]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(onResize)
        : null;
    ro?.observe(list);
    return () => {
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
    };
  }, [measure]);

  return (
    <div
      ref={listRef}
      role="group"
      aria-label="Leaderboard period"
      className="relative flex rounded-full bg-[#f6f5f2] p-1"
    >
      <motion.span
        aria-hidden
        className="pointer-events-none absolute top-1 bottom-1 rounded-full bg-[#141416]"
        initial={false}
        animate={{
          left: pill.left,
          width: Math.max(pill.width, 1),
          opacity: pill.ready ? 1 : 0,
        }}
        transition={{
          left: { type: "spring", stiffness: 420, damping: 36, mass: 0.7 },
          width: { type: "spring", stiffness: 420, damping: 36, mass: 0.7 },
          opacity: { duration: 0.15 },
        }}
      />
      {PERIODS.map((item) => {
        const selected = item === period;
        return (
          <button
            key={item}
            type="button"
            data-period={item}
            aria-pressed={selected}
            onClick={() => onPeriodChange(item)}
            className={`relative z-[1] h-8 rounded-full px-3.5 text-[13px] font-semibold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141416] ${PRESS} ${
              selected
                ? "text-white"
                : "text-[#5e5c56] hover:text-[#141416]"
            }`}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}

function LeaderboardCard({
  period,
  onPeriodChange,
  board,
}: {
  period: Period;
  onPeriodChange: (period: Period) => void;
  board: { name: string; market: string; pnl: number }[];
}) {
  return (
    <div className="w-full overflow-hidden rounded-[24px] bg-white shadow-[0_22px_50px_-28px_rgba(0,0,0,0.4)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] px-4 py-3 sm:px-5">
        <p className="text-[14px] font-semibold">Top performers</p>
        <PeriodTabs period={period} onPeriodChange={onPeriodChange} />
      </div>
      <ol>
        {board.slice(0, 4).map((trader, index) => (
          <li
            key={trader.name}
            className="flex items-center gap-3 border-b border-black/[0.06] px-4 py-3 last:border-b-0 sm:px-5"
          >
            <RankBadge rank={index + 1} />
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#141416] text-[13px] font-semibold uppercase text-white">
              {trader.name.slice(0, 1)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">
                {trader.name}
              </span>
              <span className="block text-[13px] text-[#5e5c56]">
                {trader.market}
              </span>
            </span>
            <span
              className={`text-[22px] font-semibold leading-none ${
                trader.pnl < 0 ? "text-[#e11d48]" : "text-[#0d9a42]"
              } ${instrumentSans.className}`}
            >
              {money(trader.pnl)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function FeedCard() {
  return (
    <article className="w-full rounded-[24px] bg-white p-5 shadow-[0_22px_50px_-28px_rgba(0,0,0,0.4)] sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#141416] text-[13px] font-semibold uppercase text-white">
          m
        </span>
        <div>
          <p className="text-[15px] font-semibold">mira</p>
          <p className="text-[13px] text-[#5e5c56]">Bought Lakers · 54¢</p>
        </div>
      </div>
      <p className="mt-4 text-[20px] font-semibold leading-snug tracking-[-0.03em] sm:text-[22px]">
        Lakers close this if the fourth stays slow.
      </p>
      <div className="mt-4 rounded-2xl bg-[#f6f5f2] px-4 py-3">
        <p className="text-[13px] font-semibold">cole</p>
        <p className="mt-1 text-[14px] leading-snug text-[#5e5c56]">
          Only if Reaves is still on the floor.
        </p>
      </div>
    </article>
  );
}

const REFERRAL_FEE_SHARE = 0.3;
/** Rough monthly volume turnover so 1 trader × $1,000 ≈ $16.77. */
const REFERRAL_MONTHLY_MULT = 5.59;
const REFERRAL_PLATFORM_FEE = 0.01;
const REFERRAL_TRADERS_START = 1;
const REFERRAL_TRADERS_MID = 25;
const REFERRAL_AVG_START = 100;
const REFERRAL_AVG_MID = 5000;

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

function ReferralCalculator({
  scrollRoot,
}: {
  scrollRoot: RefObject<HTMLDivElement | null>;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [traders, setTraders] = useState(REFERRAL_TRADERS_START);
  const [avgTrade, setAvgTrade] = useState(REFERRAL_AVG_START);
  const animRef = useRef<number | null>(null);
  const playedRef = useRef(false);
  const userTouchRef = useRef(false);

  const stopAnim = useCallback(() => {
    if (animRef.current != null) {
      window.cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
  }, []);

  const playDemo = useCallback(() => {
    stopAnim();
    userTouchRef.current = false;
    setTraders(REFERRAL_TRADERS_START);
    setAvgTrade(REFERRAL_AVG_START);
    const duration = 2200;
    const started = performance.now();

    const tick = (now: number) => {
      if (userTouchRef.current) {
        animRef.current = null;
        return;
      }
      const t = Math.min(1, (now - started) / duration);
      const eased = easeOutCubic(t);
      setTraders(
        Math.round(
          REFERRAL_TRADERS_START +
            (REFERRAL_TRADERS_MID - REFERRAL_TRADERS_START) * eased,
        ),
      );
      setAvgTrade(
        Math.round(
          (REFERRAL_AVG_START +
            (REFERRAL_AVG_MID - REFERRAL_AVG_START) * eased) /
            100,
        ) * 100,
      );
      if (t < 1) {
        animRef.current = window.requestAnimationFrame(tick);
      } else {
        animRef.current = null;
      }
    };

    animRef.current = window.requestAnimationFrame(tick);
  }, [stopAnim]);

  useEffect(() => {
    const el = rootRef.current;
    const root = scrollRoot.current;
    if (!el || !root) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.4) {
          if (playedRef.current) return;
          playedRef.current = true;
          playDemo();
          return;
        }
        if (!entry.isIntersecting) {
          playedRef.current = false;
          stopAnim();
          userTouchRef.current = false;
          setTraders(REFERRAL_TRADERS_START);
          setAvgTrade(REFERRAL_AVG_START);
        }
      },
      {
        root,
        threshold: [0, 0.25, 0.4, 0.6],
        rootMargin: "0px 0px -10% 0px",
      },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      stopAnim();
    };
  }, [playDemo, scrollRoot, stopAnim]);

  const onUserEdit = () => {
    userTouchRef.current = true;
    stopAnim();
  };

  const earnings =
    traders * avgTrade * REFERRAL_PLATFORM_FEE * REFERRAL_FEE_SHARE * REFERRAL_MONTHLY_MULT;
  const earningsAbs = Math.abs(earnings);
  let earningsWhole = Math.floor(earningsAbs);
  let earningsCents = Math.round((earningsAbs - earningsWhole) * 100);
  if (earningsCents >= 100) {
    earningsWhole += 1;
    earningsCents = 0;
  }
  const bars = Array.from({ length: 28 }, (_, index) => {
    const t = (index + 1) / 28;
    const curve = t * t;
    const boost = Math.min(1, earnings / 180);
    return 0.12 + curve * (0.35 + boost * 0.53);
  });

  return (
    <div
      ref={rootRef}
      className="mx-auto mt-10 max-w-[760px] rounded-[28px] bg-white p-5 sm:p-7"
    >
      <div>
        <p className="text-[13px] font-medium text-[#5e5c56]">
          Potential earnings
        </p>
        <p
          className={`mt-1 inline-flex items-baseline text-[clamp(40px,6vw,56px)] font-semibold leading-none tracking-[-0.04em] tabular-nums ${instrumentSans.className}`}
        >
          <span>${earningsWhole.toLocaleString("en-US")}</span>
          <span className="text-[#8a8882]">
            .{earningsCents.toString().padStart(2, "0")}
          </span>
        </p>
      </div>

      <div
        className="mt-8 flex h-[88px] items-end gap-[3px] sm:h-[104px] sm:gap-1"
        aria-hidden
      >
        {bars.map((height, index) => {
          const filled = index > bars.length * 0.55;
          return (
            <span
              key={index}
              className="relative min-w-0 flex-1 overflow-hidden rounded-full transition-[height] duration-300 ease-out"
              style={{
                height: `${Math.round(height * 100)}%`,
                // Aqua gel sticks — same chrome language as the Early Access pills.
                background: filled
                  ? "linear-gradient(180deg, #5c5c62 0%, #3a3a3e 32%, #2a2a2e 58%, #1c1c1f 100%)"
                  : "linear-gradient(180deg, #f4f4f5 0%, #e4e4e6 42%, #d2d2d6 100%)",
                border: filled ? "1px solid #5a5a60" : "1px solid #b8b8be",
                boxShadow: filled
                  ? "inset 0 1px 0 rgba(255,255,255,0.42), inset 0 -6px 0 2px #6a6a70, 0 4px 10px rgba(0,0,0,0.14)"
                  : "inset 0 1px 0 rgba(255,255,255,0.85), inset 0 -5px 0 2px #b3b3b3, 0 2px 6px rgba(0,0,0,0.06)",
              }}
            />
          );
        })}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <label className="block rounded-[22px] bg-[#f6f5f2] p-4">
          <span className="flex items-baseline justify-between gap-3">
            <span className="text-[13px] font-medium text-[#5e5c56]">
              Traders you invite
            </span>
            <span
              className={`text-[22px] font-semibold tabular-nums leading-none ${instrumentSans.className}`}
            >
              {traders}
            </span>
          </span>
          <input
            type="range"
            min={1}
            max={50}
            step={1}
            value={traders}
            onPointerDown={onUserEdit}
            onChange={(event) => {
              onUserEdit();
              setTraders(Number(event.target.value));
            }}
            className="worm-aqua-range mt-4 h-1.5 w-full cursor-pointer"
          />
        </label>

        <label className="block rounded-[22px] bg-[#f6f5f2] p-4">
          <span className="flex items-baseline justify-between gap-3">
            <span className="text-[13px] font-medium text-[#5e5c56]">
              Their avg. trade
            </span>
            <span
              className={`text-[22px] font-semibold tabular-nums leading-none ${instrumentSans.className}`}
            >
              ${avgTrade.toLocaleString("en-US")}
            </span>
          </span>
          <input
            type="range"
            min={100}
            max={10000}
            step={100}
            value={avgTrade}
            onPointerDown={onUserEdit}
            onChange={(event) => {
              onUserEdit();
              setAvgTrade(Number(event.target.value));
            }}
            className="worm-aqua-range mt-4 h-1.5 w-full cursor-pointer"
          />
          <span className="mt-2 block text-[12px] text-[#8a8882]">
            Bigger bets, bigger fees.
          </span>
        </label>
      </div>
    </div>
  );
}

export function WormLanding() {
  const [period, setPeriod] = useState<Period>("Week");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [activeNav, setActiveNav] = useState<NavId | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const navLockRef = useRef<NavId | "top" | null>(null);
  const unlockTimerRef = useRef<number | null>(null);
  const faqBase = useId();
  const board = BOARDS[period];

  const headerOffset = useCallback(() => {
    const height = headerRef.current?.offsetHeight ?? 64;
    // Full-viewport sections center in the screen; header overlays them.
    // Clearing the header only matters when content is top-weighted (mobile).
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 768px)").matches
    ) {
      return 0;
    }
    return height + 12;
  }, []);

  const readActiveFromScroll = useCallback(() => {
    const root = scrollRef.current;
    if (!root) return null;
    const rootRect = root.getBoundingClientRect();
    const probe =
      rootRect.top +
      (typeof window !== "undefined" &&
      window.matchMedia("(min-width: 768px)").matches
        ? root.clientHeight * 0.35
        : headerOffset());
    let current: NavId | null = null;
    for (const id of NAV_IDS) {
      const el = root.querySelector<HTMLElement>(`#${id}`);
      if (!el) continue;
      if (el.getBoundingClientRect().top <= probe + 8) current = id;
    }
    return current;
  }, [headerOffset]);

  const unlockNav = useCallback(() => {
    navLockRef.current = null;
    if (unlockTimerRef.current != null) {
      window.clearTimeout(unlockTimerRef.current);
      unlockTimerRef.current = null;
    }
    setActiveNav(readActiveFromScroll());
  }, [readActiveFromScroll]);

  const lockNavUntilScrollEnds = useCallback(
    (target: NavId | "top") => {
      const root = scrollRef.current;
      navLockRef.current = target;
      if (unlockTimerRef.current != null) {
        window.clearTimeout(unlockTimerRef.current);
      }

      const finish = () => {
        root?.removeEventListener("scrollend", finish);
        unlockNav();
      };

      root?.addEventListener("scrollend", finish, { once: true });
      unlockTimerRef.current = window.setTimeout(finish, 1000);
    },
    [unlockNav],
  );

  const goTo = useCallback(
    (id: string) => {
      const root = scrollRef.current;
      if (!root) return;
      scrollToId(root, id, headerOffset());
    },
    [headerOffset],
  );

  const onNavClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, id: NavId) => {
      event.preventDefault();
      lockNavUntilScrollEnds(id);
      setActiveNav(id);
      goTo(id);
      history.replaceState(null, "", `#${id}`);
    },
    [goTo, lockNavUntilScrollEnds],
  );

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    const update = () => {
      if (navLockRef.current != null) return;
      setActiveNav(readActiveFromScroll());
    };

    update();
    root.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      root.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [readActiveFromScroll]);

  return (
    <div
      ref={scrollRef}
      className="fixed inset-0 z-[80] overflow-y-auto overscroll-y-contain bg-[#f6f5f2] text-[#141416] [scrollbar-gutter:stable]"
    >
      <DownloadModal
        open={downloadOpen}
        onClose={() => setDownloadOpen(false)}
      />
      <header ref={headerRef} className="sticky top-0 z-50">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[calc(100%+2.75rem)]"
        >
          <div className="worm-header-blur">
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-white via-white/80 to-transparent" />
        </div>
        <div className="relative mx-auto flex w-full max-w-[1440px] flex-col gap-2 px-5 py-4 sm:px-8 sm:py-4">
          <div className="relative flex h-12 items-center justify-between sm:h-16">
            <a
              href="#top"
              aria-label="Worm"
              onClick={(event) => {
                event.preventDefault();
                lockNavUntilScrollEnds("top");
                setActiveNav(null);
                scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                history.replaceState(null, "", "#top");
              }}
              className={`relative z-10 flex shrink-0 items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#141416] ${PRESS}`}
            >
              <img
                src="/worm/logo-mark.png"
                alt=""
                width={44}
                height={44}
                className="h-11 w-11 object-contain"
              />
            </a>
            {NAV.length > 0 ? (
              <nav
                aria-label="On this page"
                className="pointer-events-none absolute inset-x-0 top-1/2 z-0 hidden -translate-y-1/2 justify-center md:flex"
              >
                <div className="pointer-events-auto text-[14px] font-medium">
                  <NavLinks activeNav={activeNav} onNavClick={onNavClick} />
                </div>
              </nav>
            ) : null}
            <div className="relative z-10 shrink-0">
              <EarlyAccess
                size="nav"
                onOpen={() => setDownloadOpen(true)}
              />
            </div>
          </div>
          {NAV.length > 0 ? (
            <nav
              aria-label="On this page"
              className="-mx-5 overflow-x-auto px-5 pb-1 text-[14px] font-medium [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden"
            >
              <NavLinks activeNav={activeNav} onNavClick={onNavClick} />
            </nav>
          ) : null}
        </div>
      </header>

      <main id="top">
        <section className="relative flex min-h-[100svh] flex-col justify-start">
          <div className="mx-auto w-full max-w-[760px] shrink-0 px-5 pb-8 pt-12 text-center sm:px-8 sm:pb-10 sm:pt-14 md:pb-12 md:pt-10">
            <RotatingTitle />
          </div>
          <div className="relative z-0 mt-8 px-5 pb-0 sm:mt-10 md:mt-6">
            <Phone />
          </div>
        </section>

        {SHOW_PRODUCT_SECTION ? (
          <section
            id="product"
            aria-labelledby="product-heading"
            className="relative z-[1] flex scroll-mt-28 bg-[#f6f5f2] sm:scroll-mt-16 md:min-h-svh md:scroll-mt-0 md:items-center"
          >
            <div className="mx-auto w-full max-w-[1120px] px-5 py-14 sm:px-8 md:py-20 lg:py-24">
              <h2 id="product-heading" className="sr-only">
                Product
              </h2>
              <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
                {PRODUCT_BEATS.map((beat) => {
                  const dark = beat.tone === "dark";
                  return (
                    <article
                      key={beat.id}
                      id={beat.id}
                      className={`flex min-h-[420px] min-w-0 flex-col overflow-hidden rounded-[28px] md:min-h-[460px] ${
                        dark
                          ? "bg-[#141416] text-white"
                          : "bg-[#e8e6e1] text-[#141416]"
                      }`}
                    >
                      <div
                        className={`flex flex-1 items-center justify-center px-5 pt-6 sm:px-7 sm:pt-8 ${
                          dark
                            ? "bg-[radial-gradient(120%_80%_at_50%_0%,#2a2a2e_0%,#141416_62%)]"
                            : ""
                        }`}
                      >
                        <div className="w-full max-w-[400px]">
                          {beat.id === "markets" ? <MarketsCard /> : null}
                          {beat.id === "leaderboard" ? (
                            <LeaderboardCard
                              period={period}
                              onPeriodChange={setPeriod}
                              board={board}
                            />
                          ) : null}
                          {beat.id === "feed" ? <FeedCard /> : null}
                          {beat.id === "copy" ? <CopyShowcaseCard /> : null}
                        </div>
                      </div>
                      <div className="px-6 pb-6 pt-5 sm:px-8 sm:pb-7">
                        <h3 className="text-balance text-[clamp(22px,2.4vw,28px)] font-semibold leading-[1.15] tracking-[-0.035em]">
                          {beat.title}
                        </h3>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        <section
          id="how"
          className="flex scroll-mt-28 sm:scroll-mt-16 md:min-h-svh md:scroll-mt-0 md:items-center"
        >
          <div className="mx-auto w-full max-w-[1120px] px-5 py-20 sm:px-8 md:py-0">
            <div className="mx-auto max-w-[720px] text-center">
              <h2 className="text-balance text-[clamp(32px,4vw,48px)] font-semibold leading-[1.05] tracking-[-0.04em]">
                Bring traders. Get paid.
              </h2>
              <p className="mt-4 text-[17px] leading-relaxed text-[#5e5c56]">
                Earn 30% of the fees from your invites and 20% from their
                invites.
              </p>
            </div>
            <ReferralCalculator scrollRoot={scrollRef} />
          </div>
        </section>

        <section className="">
          <div className="mx-auto max-w-[760px] px-5 py-14 sm:px-8 md:py-20">
            <h2 className="text-center text-[clamp(32px,4vw,48px)] font-semibold tracking-[-0.04em]">
              Questions
            </h2>
            <div className="mt-5 divide-y divide-black/[0.08]">
              {FAQS.map((item, index) => {
                const open = openFaq === index;
                const panelId = `${faqBase}-panel-${index}`;
                const buttonId = `${faqBase}-button-${index}`;
                return (
                  <div key={item.q}>
                    <h3>
                      <button
                        id={buttonId}
                        type="button"
                        aria-expanded={open}
                        aria-controls={panelId}
                        onClick={() => setOpenFaq(open ? null : index)}
                        className={`flex w-full items-center justify-between gap-6 py-5 text-left text-[17px] font-semibold tracking-[-0.02em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141416] ${PRESS}`}
                      >
                        {item.q}
                        <span
                          aria-hidden
                          className={`text-[22px] font-medium leading-none text-[#5e5c56] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                            open ? "rotate-45" : "rotate-0"
                          }`}
                        >
                          +
                        </span>
                      </button>
                    </h3>
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      aria-hidden={!open}
                      className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
                      style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
                    >
                      <div className="min-h-0 overflow-hidden">
                        <p
                          className={`max-w-[560px] pb-5 text-[15px] leading-relaxed text-[#5e5c56] transition-opacity duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                            open ? "opacity-100" : "opacity-0"
                          }`}
                        >
                          {item.a}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="relative overflow-visible">
          <ClosingLogoField scrollRoot={scrollRef} />
          <div className="relative z-10 mx-auto max-w-[760px] px-5 py-24 text-center sm:px-8 md:py-32">
            <RotatingTitle
              as="h2"
              className="text-[clamp(40px,6vw,68px)]"
            />
            <div className="mt-8">
              <EarlyAccess onOpen={() => setDownloadOpen(true)} />
            </div>
          </div>
        </section>
      </main>

      <footer className="">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-12 px-5 py-14 sm:px-8 sm:py-16 md:flex-row md:items-start md:justify-between md:gap-16">
          <p className="shrink-0 text-[14px] text-[#5e5c56]">Worm © 2026</p>
          <div className="grid grid-cols-2 gap-x-10 gap-y-10 sm:grid-cols-3 sm:gap-x-16 md:gap-x-20">
            <div>
              <p className="text-[13px] font-semibold text-[#141416]">Help</p>
              <ul className="mt-4 space-y-3 text-[14px] text-[#5e5c56]">
                <li>
                  <FooterSupport />
                </li>
              </ul>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[#141416]">Socials</p>
              <ul className="mt-4 space-y-3 text-[14px] text-[#5e5c56]">
                <li>
                  <a
                    href="https://x.com/dappdesigner"
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full transition-opacity hover:text-[#141416] hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#141416]"
                  >
                    X
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[#141416]">Company</p>
              <ul className="mt-4 space-y-3 text-[14px] text-[#5e5c56]">
                <li>
                  <button
                    type="button"
                    className={`rounded-full transition-opacity hover:text-[#141416] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#141416] ${PRESS}`}
                  >
                    Terms of Use
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className={`rounded-full transition-opacity hover:text-[#141416] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#141416] ${PRESS}`}
                  >
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <a
                    href="https://worm.wtf"
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full transition-opacity hover:text-[#141416] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#141416]"
                  >
                    Web App
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
