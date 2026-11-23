"use client";

import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useSpring,
} from "framer-motion";
import Image from "next/image";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { instrumentSans } from "@/lib/fonts";

type SportsVideoListener = (playingId: string | null) => void;

const SportsVideoLockContext = createContext<{
  report: (id: string, ratio: number) => void;
  subscribe: (listener: SportsVideoListener) => () => void;
  getPlayingId: () => string | null;
} | null>(null);

/** Ref-based lock — avoids re-rendering the whole feed on every scroll tick. */
function SportsVideoLockProvider({ children }: { children: ReactNode }) {
  const ratiosRef = useRef(new Map<string, number>());
  const playingIdRef = useRef<string | null>(null);
  const listenersRef = useRef(new Set<SportsVideoListener>());

  const report = useCallback((id: string, ratio: number) => {
    const map = ratiosRef.current;
    // Only fully visible cards compete for playback.
    if (ratio < 0.99) map.delete(id);
    else map.set(id, ratio);

    let bestId: string | null = null;
    let bestRatio = 0;
    for (const [key, value] of map) {
      if (value > bestRatio) {
        bestRatio = value;
        bestId = key;
      }
    }
    if (playingIdRef.current === bestId) return;
    playingIdRef.current = bestId;
    listenersRef.current.forEach((listener) => listener(bestId));
  }, []);

  const subscribe = useCallback((listener: SportsVideoListener) => {
    listenersRef.current.add(listener);
    listener(playingIdRef.current);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const getPlayingId = useCallback(() => playingIdRef.current, []);

  const value = useMemo(
    () => ({ report, subscribe, getPlayingId }),
    [report, subscribe, getPlayingId],
  );

  return (
    <SportsVideoLockContext.Provider value={value}>
      {children}
    </SportsVideoLockContext.Provider>
  );
}

type PickOption = {
  id: string;
  label: string;
  percent: number;
  /** Progress fill — team color, or yes/no tone. */
  color: string;
  logo?: string;
  mark?: string;
};

type PickCard = {
  id: string;
  title: string;
  /** Sports: photo behind the card. Crypto slides leave this empty. */
  background?: string;
  /** Optional muted looping highlights (native video — no player chrome). */
  video?: string;
  options: PickOption[];
  /** Crypto-only overlay fields when the slide changes. */
  crypto?: {
    price: string;
    priceValue: number;
    delta: string;
    deltaHint: string;
    deltaUp?: boolean;
    chance: string;
    chanceValue: number;
    target: string;
    targetValue: number;
  };
};

type MarketCard = {
  id: string;
  kind: "sports" | "crypto";
  title: string;
  subtitle?: string;
  logo: string;
  picks: PickCard[];
};

const MARKETS: MarketCard[] = [
  {
    id: "nba",
    kind: "sports",
    title: "NBA",
    logo: "/worm-app-2/logos/nba.png",
    picks: [
      {
        id: "nba-hawks-pistons",
        title: "Tomorrow 1:00",
        background: "/worm-app-2/bg/hawks-pistons.jpg",
        video: "/worm-app-2/bg/hawks-pistons.mp4",
        options: [
          {
            id: "hawks",
            label: "Hawks",
            percent: 45,
            color: "#C8102E",
            logo: "/worm-app-2/logos/hawks.png",
          },
          {
            id: "pistons",
            label: "Pistons",
            percent: 55,
            color: "#1D42BA",
            logo: "/worm-app-2/logos/pistons.png",
          },
        ],
      },
      {
        id: "nba-knicks-spurs",
        title: "Tonight 8:30",
        background: "/worm-app-2/bg/knicks-spurs.jpg",
        video: "/worm-app-2/bg/knicks-spurs.mp4",
        options: [
          {
            id: "knicks",
            label: "Knicks",
            percent: 58,
            color: "#F58426",
            logo: "/worm-app-2/logos/knicks.png",
          },
          {
            id: "spurs",
            label: "Spurs",
            percent: 42,
            color: "#C4CED4",
            logo: "/worm-app-2/logos/spurs.png",
          },
        ],
      },
      {
        id: "nba-lakers-celtics",
        title: "Fri 10:00",
        background: "/worm-app-2/bg/lakers-celtics.jpg",
        video: "/worm-app-2/bg/lakers-celtics.mp4",
        options: [
          {
            id: "lakers",
            label: "Lakers",
            percent: 49,
            color: "#552583",
            logo: "/worm-app-2/logos/lakers.png",
          },
          {
            id: "celtics",
            label: "Celtics",
            percent: 51,
            color: "#007A33",
            logo: "/worm-app-2/logos/celtics.png",
          },
        ],
      },
    ],
  },
  {
    id: "laliga",
    kind: "sports",
    title: "LaLiga",
    subtitle: "Matchday 13 of 38",
    logo: "/worm-app-2/logos/laliga.png",
    picks: [
      {
        id: "laliga-getafe-atletico",
        title: "Today 1:00",
        background: "/worm-app-2/bg/getafe-atletico.jpg",
        video: "/worm-app-2/bg/getafe-atletico.mp4",
        options: [
          {
            id: "getafe",
            label: "Getafe",
            percent: 45,
            color: "#0057B8",
            logo: "/worm-app-2/logos/getafe.png",
          },
          {
            id: "atletico",
            label: "Atlético",
            percent: 55,
            color: "#CB3524",
            logo: "/worm-app-2/logos/atletico.png",
          },
        ],
      },
      {
        id: "laliga-barca-madrid",
        title: "Sat 4:15",
        background: "/worm-app-2/bg/barca-madrid.jpg",
        video: "/worm-app-2/bg/barca-madrid.mp4",
        options: [
          {
            id: "barca",
            label: "Barça",
            percent: 47,
            color: "#A50044",
            logo: "/worm-app-2/logos/barcelona.png",
          },
          {
            id: "madrid",
            label: "Madrid",
            percent: 53,
            color: "#FEBE10",
            logo: "/worm-app-2/logos/madrid.png",
          },
        ],
      },
      {
        id: "laliga-sevilla-valencia",
        title: "Sun 2:00",
        background: "/worm-app-2/bg/sevilla-valencia.jpg",
        video: "/worm-app-2/bg/sevilla-valencia.mp4",
        options: [
          {
            id: "sevilla",
            label: "Sevilla",
            percent: 41,
            color: "#E81F2C",
            logo: "/worm-app-2/logos/sevilla.png",
          },
          {
            id: "valencia",
            label: "Valencia",
            percent: 59,
            color: "#EE3524",
            logo: "/worm-app-2/logos/valencia.png",
          },
        ],
      },
    ],
  },
  {
    id: "atp",
    kind: "sports",
    title: "ATP",
    subtitle: "Nitto Finals",
    logo: "/worm-app-2/logos/atp-tour.png",
    picks: [
      {
        id: "atp-alcaraz-sinner",
        title: "Tonight 3:00",
        background: "/worm-app-2/bg/alcaraz-sinner.jpg",
        video: "/worm-app-2/bg/alcaraz-sinner.mp4",
        options: [
          {
            id: "alcaraz",
            label: "Alcaraz",
            percent: 48,
            color: "#C8102E",
            logo: "/worm-app-2/logos/alcaraz.png",
          },
          {
            id: "sinner",
            label: "Sinner",
            percent: 52,
            color: "#008C45",
            logo: "/worm-app-2/logos/sinner.png",
          },
        ],
      },
      {
        id: "atp-djokovic-medvedev",
        title: "Tomorrow 5:30",
        background: "/worm-app-2/bg/djokovic-medvedev.jpg",
        video: "/worm-app-2/bg/djokovic-medvedev.mp4",
        options: [
          {
            id: "djokovic",
            label: "Djokovic",
            percent: 55,
            color: "#0C2340",
            logo: "/worm-app-2/logos/djokovic.png",
          },
          {
            id: "medvedev",
            label: "Medvedev",
            percent: 45,
            color: "#0039A6",
            logo: "/worm-app-2/logos/medvedev.png",
          },
        ],
      },
      {
        id: "atp-fritz-zverev",
        title: "Sat 1:00",
        background: "/worm-app-2/bg/fritz-zverev.jpg",
        video: "/worm-app-2/bg/fritz-zverev.mp4",
        options: [
          {
            id: "fritz",
            label: "Fritz",
            percent: 44,
            color: "#3C3B6E",
            logo: "/worm-app-2/logos/fritz.png",
          },
          {
            id: "zverev",
            label: "Zverev",
            percent: 56,
            color: "#000000",
            logo: "/worm-app-2/logos/zverev.png",
          },
        ],
      },
    ],
  },
  {
    id: "btc",
    kind: "crypto",
    title: "Bitcoin",
    logo: "/worm-app-2/logos/bitcoin.png",
    picks: [
      {
        id: "btc-58888",
        title: "Bitcoin at or above $58,888?",
        crypto: {
          price: "$60,821",
          priceValue: 60821,
          delta: "$1,920",
          deltaHint: "above target",
          deltaUp: true,
          chance: "95%",
          chanceValue: 95,
          target: "$58,888",
          targetValue: 58888,
        },
        options: [
          {
            id: "yes",
            label: "Yes",
            percent: 45,
            color: "#338003",
            logo: "/worm-app-2/logos/bitcoin.png",
          },
          {
            id: "no",
            label: "No",
            percent: 55,
            color: "#633a3a",
            logo: "/worm-app-2/logos/bitcoin.png",
          },
        ],
      },
      {
        id: "btc-65000",
        title: "Bitcoin at or above $65,000?",
        crypto: {
          price: "$60,821",
          priceValue: 60821,
          delta: "$4,179",
          deltaHint: "below target",
          deltaUp: false,
          chance: "38%",
          chanceValue: 38,
          target: "$65,000",
          targetValue: 65000,
        },
        options: [
          {
            id: "yes-65",
            label: "Yes",
            percent: 38,
            color: "#338003",
            logo: "/worm-app-2/logos/bitcoin.png",
          },
          {
            id: "no-65",
            label: "No",
            percent: 62,
            color: "#633a3a",
            logo: "/worm-app-2/logos/bitcoin.png",
          },
        ],
      },
    ],
  },
];

const MAX_COMBO_PICKS = 8;
const MAX_CHIP_LOGOS = 3;

type ComboPick = {
  id: string;
  label: string;
  logo?: string;
  mark?: string;
  /** Options from the same game card share this so + swaps sides. */
  groupId: string;
};

function OptionEmblem({
  logo,
  mark,
  label,
  size = 20,
}: {
  logo?: string;
  mark?: string;
  label: string;
  size?: number;
}) {
  if (logo) {
    return (
      <Image
        src={logo}
        alt=""
        width={size}
        height={size}
        className="shrink-0 object-contain"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-white/15 font-semibold tracking-tight text-white"
      style={{ width: size, height: size, fontSize: Math.max(8, size * 0.38) }}
      aria-hidden
    >
      {mark ?? label.slice(0, 2).toUpperCase()}
    </span>
  );
}

function OptionRow({
  option,
  groupId,
  selected,
  disabled,
  onToggle,
}: {
  option: PickOption;
  groupId: string;
  selected: boolean;
  disabled: boolean;
  onToggle: (pick: ComboPick) => void;
}) {
  const blocked = !selected && disabled;

  return (
    <div className="flex w-full items-start gap-2 overflow-hidden">
      <button
        type="button"
        aria-label={`${option.label} ${option.percent}%`}
        className="relative flex h-12 min-w-0 flex-1 items-center justify-between overflow-hidden rounded-xl bg-[rgba(38,38,38,0.6)] pl-3 pr-4 text-left"
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
            <OptionEmblem
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
      <button
        type="button"
        aria-label={selected ? `Remove ${option.label}` : `Add ${option.label}`}
        aria-pressed={selected}
        disabled={blocked}
        onClick={(event) => {
          event.stopPropagation();
          onToggle({
            id: option.id,
            label: option.label,
            logo: option.logo,
            mark: option.mark,
            groupId,
          });
        }}
        className={`relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full transition-colors duration-200 disabled:opacity-35 ${
          selected
            ? "bg-white/25 text-white"
            : "bg-[rgba(38,38,38,0.6)]"
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
    </div>
  );
}

function TeamPicksCard({
  pick,
  selectedIds,
  atLimit,
  onToggle,
}: {
  pick: PickCard;
  selectedIds: Set<string>;
  atLimit: boolean;
  onToggle: (pick: ComboPick) => void;
}) {
  return (
    <div className="w-[min(311px,82vw)] shrink-0 rounded-[20px] bg-[rgba(55,55,55,0.7)] p-4 backdrop-blur-md">
      <p className="mb-3 text-[16px] font-medium text-white">{pick.title}</p>
      <div className="flex flex-col gap-2">
        {pick.options.map((option) => {
          const selected = selectedIds.has(option.id);
          return (
            <OptionRow
              key={option.id}
              option={option}
              groupId={pick.id}
              selected={selected}
              disabled={atLimit && !selected}
              onToggle={onToggle}
            />
          );
        })}
      </div>
    </div>
  );
}

function formatUsd(value: number) {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

/** Native muted loop — one winner globally; loads only when near viewport. */
function SportsVideoBg({
  id,
  src,
  poster,
  active,
  priority,
}: {
  id: string;
  src: string;
  poster?: string;
  active: boolean;
  priority?: boolean;
}) {
  const lock = useContext(SportsVideoLockContext);
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const nearRef = useRef(false);
  const [near, setNear] = useState(false);
  const [isWinner, setIsWinner] = useState(false);

  useEffect(() => {
    if (!lock) return;
    return lock.subscribe((playingId) => {
      setIsWinner(playingId === id);
    });
  }, [id, lock]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !lock) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const ratio = entry?.isIntersecting ? entry.intersectionRatio : 0;
        const nextNear = ratio > 0 || Boolean(entry?.isIntersecting);
        if (nearRef.current !== nextNear) {
          nearRef.current = nextNear;
          setNear(nextNear);
        }
        lock.report(id, active ? ratio : 0);
      },
      { threshold: [0, 0.5, 0.85, 0.99, 1], rootMargin: "0px" },
    );
    observer.observe(root);
    return () => {
      observer.disconnect();
      lock.report(id, 0);
    };
  }, [active, id, lock]);

  useEffect(() => {
    if (!active) lock?.report(id, 0);
  }, [active, id, lock]);

  const shouldPlay = active && isWinner;
  // Keep src mounted while near — clearing it mid-play breaks native loop.
  const mediaSrc = near || active ? src : undefined;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = true;

    const restart = () => {
      try {
        video.currentTime = 0;
      } catch {
        /* ignore seek errors while loading */
      }
      if (shouldPlay) void video.play().catch(() => {});
    };

    // Native `loop` is flaky on iOS/WebKit; force wrap before the clip ends.
    const onTimeUpdate = () => {
      if (!shouldPlay) return;
      const { duration, currentTime } = video;
      if (!Number.isFinite(duration) || duration <= 0) return;
      if (currentTime >= duration - 0.12) restart();
    };

    video.addEventListener("ended", restart);
    video.addEventListener("timeupdate", onTimeUpdate);

    if (shouldPlay) {
      void video.play().catch(() => {});
    } else {
      video.pause();
    }

    return () => {
      video.removeEventListener("ended", restart);
      video.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [shouldPlay, mediaSrc]);

  return (
    <div
      ref={rootRef}
      aria-hidden
      className={`absolute inset-0 overflow-hidden transition-opacity duration-300 ease-out ${
        active ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <video
        ref={videoRef}
        className="absolute inset-0 size-full object-cover [transform:translateZ(0)]"
        src={mediaSrc}
        poster={poster}
        muted
        loop
        autoPlay={shouldPlay}
        playsInline
        preload={priority || active ? "auto" : "none"}
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
      />
      {/* Bottom-only progressive blur (clipped) + scrim — never a full-card frosted cover. */}
      <div
        aria-hidden
        className="api-progressive-blur z-[1] h-[42%]"
        data-edge="bottom"
      >
        <i />
        <i />
        <i />
        <i />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[42%] bg-gradient-to-t from-black/55 via-black/20 to-transparent"
      />
    </div>
  );
}

function seededSeries(seed: number, count: number, start: number, end: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  const next = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  const points: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    const drift = start + (end - start) * t;
    const wave =
      Math.sin(t * Math.PI * 3.2 + seed) * (end - start) * 0.08 +
      Math.sin(t * Math.PI * 7.1) * (end - start) * 0.035;
    const noise = (next() - 0.5) * (end - start) * 0.09;
    // Mid dip so the line clearly crosses below the lower target.
    const dip = Math.exp(-Math.pow((t - 0.42) / 0.1, 2)) * (end - start) * -0.55;
    points.push(drift + wave + noise + dip);
  }
  return points;
}

function splitColoredPaths(
  values: number[],
  target: number,
  xAt: (i: number) => number,
  yAt: (v: number) => number,
) {
  type Seg = { above: boolean; d: string };
  const segs: Seg[] = [];
  let current: Seg | null = null;

  const pushPoint = (above: boolean, x: number, y: number, start: boolean) => {
    if (!current || current.above !== above) {
      current = { above, d: `${start || !current ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}` };
      segs.push(current);
    } else {
      current.d += ` L${x.toFixed(2)} ${y.toFixed(2)}`;
    }
  };

  for (let i = 0; i < values.length - 1; i += 1) {
    const a = values[i];
    const b = values[i + 1];
    const x0 = xAt(i);
    const x1 = xAt(i + 1);
    const y0 = yAt(a);
    const y1 = yAt(b);
    const above0 = a >= target;
    const above1 = b >= target;

    pushPoint(above0, x0, y0, i === 0);

    if (above0 !== above1) {
      const t = (target - a) / (b - a || 1);
      const xc = x0 + (x1 - x0) * t;
      const yc = yAt(target);
      current!.d += ` L${xc.toFixed(2)} ${yc.toFixed(2)}`;
      current = {
        above: above1,
        d: `M${xc.toFixed(2)} ${yc.toFixed(2)} L${x1.toFixed(2)} ${y1.toFixed(2)}`,
      };
      segs.push(current);
    } else {
      current!.d += ` L${x1.toFixed(2)} ${y1.toFixed(2)}`;
    }
  }

  return segs;
}

function BitcoinTargetChart({
  price,
  target,
  targetLabel,
  scaleTargets,
  onScrub,
}: {
  price: number;
  target: number;
  targetLabel: string;
  /** All market targets — keeps Y scale (and the line) fixed while the dashed level moves. */
  scaleTargets: number[];
  onScrub: (value: number | null) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const scrubbingRef = useRef(false);
  const [size, setSize] = useState({ w: 386, h: 104 });
  const [scrubIdx, setScrubIdx] = useState<number | null>(null);
  const [liveTarget, setLiveTarget] = useState(target);
  const targetSpring = useSpring(target, {
    stiffness: 240,
    damping: 32,
    mass: 0.85,
  });

  // Fixed series that dips below the lowest target so below-line segments render red.
  const values = useMemo(() => {
    const low = Math.min(...scaleTargets, price);
    const span = Math.max(price - low, price * 0.04);
    const start = low - span * 0.2;
    return seededSeries(Math.round(price + low), 49, start, price);
  }, [price, scaleTargets]);

  useEffect(() => {
    targetSpring.set(target);
  }, [target, targetSpring]);

  useMotionValueEvent(targetSpring, "change", (value) => {
    setLiveTarget(value);
  });

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const sync = () => {
      const rect = el.getBoundingClientRect();
      setSize({ w: Math.max(1, rect.width), h: Math.max(1, rect.height) });
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setScrubIdx(null);
    onScrub(null);
  }, [price, onScrub]);

  const padT = 6;
  const padB = 4;
  const chartH = Math.max(1, size.h - padT - padB);
  const minV = Math.min(...values, ...scaleTargets, target) * 0.992;
  const maxV = Math.max(...values, ...scaleTargets, target, price) * 1.008;
  const xAt = (i: number) =>
    values.length <= 1 ? 0 : (i / (values.length - 1)) * size.w;
  const yAt = (v: number) =>
    padT + ((maxV - v) / (maxV - minV || 1)) * chartH;
  const targetY = yAt(liveTarget);
  const segments = splitColoredPaths(values, liveTarget, xAt, yAt);

  const applyScrub = (clientX: number) => {
    const el = svgRef.current;
    if (!el || values.length === 0) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(
      1,
      Math.max(0, (clientX - rect.left) / Math.max(rect.width, 1)),
    );
    const idx = Math.round(ratio * (values.length - 1));
    setScrubIdx(idx);
    onScrub(values[idx]!);
  };

  const clearScrub = () => {
    scrubbingRef.current = false;
    setScrubIdx(null);
    onScrub(null);
  };

  const scrubPoint =
    scrubIdx != null
      ? { x: xAt(scrubIdx), y: yAt(values[scrubIdx]!), value: values[scrubIdx]! }
      : null;
  const tip =
    scrubPoint ??
    ({
      x: xAt(values.length - 1),
      y: yAt(values[values.length - 1]!),
      value: values[values.length - 1]!,
    } as const);
  const tipAbove = tip.value >= liveTarget;
  const pillTop = Math.min(size.h - 28, Math.max(0, targetY - 13));
  const dashEndX = Math.max(24, size.w - 88);

  return (
    <div className="absolute inset-x-0 top-[190px] h-[104px]">
      <div
        className="relative h-full w-full touch-none select-none"
        role="img"
        aria-label={`Bitcoin chart. Hover or drag to inspect price. Target ${targetLabel}.`}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${size.w} ${size.h}`}
          preserveAspectRatio="none"
          className="absolute inset-0 size-full"
          onPointerDown={(event) => {
            if (event.pointerType === "touch") {
              scrubbingRef.current = true;
              event.currentTarget.setPointerCapture(event.pointerId);
            }
            applyScrub(event.clientX);
          }}
          onPointerMove={(event) => {
            if (event.pointerType === "touch" && !scrubbingRef.current) return;
            applyScrub(event.clientX);
          }}
          onPointerUp={() => {
            if (scrubbingRef.current) clearScrub();
          }}
          onPointerCancel={clearScrub}
          onPointerLeave={(event) => {
            if (event.pointerType === "touch") return;
            clearScrub();
          }}
        >
          {/* Same Y as color split — below = red, above = green */}
          <line
            x1={16}
            x2={dashEndX}
            y1={targetY}
            y2={targetY}
            stroke="rgba(255,255,255,0.4)"
            strokeWidth={1}
            strokeDasharray="2 4"
            vectorEffect="non-scaling-stroke"
          />
          {segments.map((seg, i) => (
            <path
              key={`${seg.above}-${i}`}
              d={seg.d}
              fill="none"
              stroke={seg.above ? "#00D543" : "#FF3B30"}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              opacity={scrubPoint ? (seg.above === tipAbove ? 1 : 0.55) : 1}
            />
          ))}
          {scrubPoint ? (
            <line
              x1={scrubPoint.x}
              x2={scrubPoint.x}
              y1={0}
              y2={size.h}
              stroke="rgba(255,255,255,0.35)"
              strokeWidth={1}
            />
          ) : null}
          {scrubPoint ? (
            <circle
              cx={scrubPoint.x}
              cy={scrubPoint.y}
              r={5}
              fill={tipAbove ? "#00D543" : "#FF3B30"}
              stroke="#1b1b1b"
              strokeWidth={2}
            />
          ) : null}
        </svg>

        <div
          className="pointer-events-none absolute right-3 overflow-hidden rounded-lg bg-white/10 px-2 py-1.5 text-[14px] font-medium leading-none text-white"
          style={{ top: pillTop }}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={targetLabel}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="inline-block tabular-nums"
            >
              {targetLabel}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function MarketPreview({
  market,
  selectedIds,
  atLimit,
  onToggle,
}: {
  market: MarketCard;
  selectedIds: Set<string>;
  atLimit: boolean;
  onToggle: (pick: ComboPick) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [scrubValue, setScrubValue] = useState<number | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  // Price series stays fixed; dashed target + delta follow the active pick.
  const baseCrypto = market.picks[0]?.crypto;
  const chartCrypto =
    market.picks[activeIndex]?.crypto ?? baseCrypto;
  const scaleTargets = useMemo(
    () =>
      market.picks
        .map((pick) => pick.crypto?.targetValue)
        .filter((value): value is number => value != null),
    [market.picks],
  );

  useEffect(() => {
    setScrubValue(null);
  }, [market.id]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const slides = Array.from(scroller.children) as HTMLElement[];
      if (slides.length === 0) return;
      const left = scroller.scrollLeft;
      let best = 0;
      let bestDist = Number.POSITIVE_INFINITY;
      slides.forEach((slide, index) => {
        const dist = Math.abs(slide.offsetLeft - left);
        if (dist < bestDist) {
          bestDist = dist;
          best = index;
        }
      });
      setActiveIndex((prev) => (prev === best ? prev : best));
    };

    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(update);
    };

    update();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [market.id, market.picks.length]);

  return (
    <article className="relative h-[min(580px,74vh)] w-full overflow-hidden rounded-[24px] bg-[#131313]">
      {market.kind === "sports" ? (
        <>
          {market.picks.map((pick, index) => {
            const active = index === activeIndex;
            if (pick.video) {
              return (
                <SportsVideoBg
                  key={pick.id}
                  id={pick.id}
                  src={pick.video}
                  poster={pick.background}
                  active={active}
                  priority={index === 0}
                />
              );
            }
            if (pick.background) {
              return (
                <Image
                  key={pick.id}
                  src={pick.background}
                  alt=""
                  fill
                  priority={market.id === "nba" && index === 0}
                  className={`object-cover transition-opacity duration-300 ease-out ${
                    active ? "opacity-100" : "opacity-0"
                  }`}
                  sizes="(max-width: 430px) 100vw, 402px"
                />
              );
            }
            return null;
          })}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-24 bg-gradient-to-b from-[rgba(27,27,27,0.65)] to-transparent"
          />
          {/* Bottom progressive blur lives on SportsVideoBg; stills get a soft scrim. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[55%] bg-gradient-to-t from-black/60 via-black/25 to-transparent"
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-[#1b1b1b]">
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[rgba(27,27,27,0.6)] to-transparent"
          />
          {chartCrypto ? (
            <>
              {(() => {
                const displayPrice = scrubValue ?? chartCrypto.priceValue;
                const vsTarget = displayPrice - chartCrypto.targetValue;
                const aboveTarget = vsTarget >= 0;
                return (
                  <div className="absolute left-4 top-[77px] w-[220px]">
                    <p className="text-[40px] font-semibold leading-none tabular-nums text-white">
                      {formatUsd(displayPrice)}
                    </p>
                    <div
                      className={`mt-1 flex items-center gap-1.5 ${
                        aboveTarget ? "text-[#5df100]" : "text-[#ff6b6b]"
                      }`}
                    >
                      <svg
                        viewBox="0 0 20 20"
                        width={20}
                        height={20}
                        className={`size-5 shrink-0 ${aboveTarget ? "" : "rotate-180"}`}
                        fill="none"
                        aria-hidden
                      >
                        <path
                          d="M5 15L15 5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M5 5H15V15"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span className="text-[16px] font-medium tabular-nums">
                        {formatUsd(Math.abs(vsTarget))}
                      </span>
                      <span className="text-[16px] font-medium text-white/60">
                        {aboveTarget ? "above target" : "below target"}
                      </span>
                    </div>
                  </div>
                );
              })()}
              <BitcoinTargetChart
                price={baseCrypto?.priceValue ?? chartCrypto.priceValue}
                target={chartCrypto.targetValue}
                targetLabel={chartCrypto.target}
                scaleTargets={scaleTargets}
                onScrub={setScrubValue}
              />
            </>
          ) : null}
        </div>
      )}

      <div className="absolute left-4 top-4 z-[1] flex items-center gap-3">
        <div className="relative size-[49px] shrink-0">
          <Image
            src={market.logo}
            alt=""
            fill
            className="object-contain"
            sizes="49px"
          />
        </div>
        <div className="min-w-0">
          <p className="text-[24px] font-semibold leading-none text-white">
            {market.title}
          </p>
          {market.kind === "sports" && market.subtitle ? (
            <p className="mt-0.5 text-[14px] font-medium text-white/80">
              {market.subtitle}
            </p>
          ) : null}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-2.5 z-[1]">
        <div
          ref={scrollerRef}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-pl-2.5 pr-2.5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {market.picks.map((pick, index) => (
            <div
              key={pick.id}
              className={`snap-start ${index === 0 ? "ml-2.5" : ""}`}
            >
              <TeamPicksCard
                pick={pick}
                selectedIds={selectedIds}
                atLimit={atLimit}
                onToggle={onToggle}
              />
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function FeedHeader() {
  return (
    <header className="flex items-start justify-between px-5 pt-[calc(env(safe-area-inset-top,0px)+24px)]">
      <div className="flex items-center gap-3">
        <div className="relative size-10 overflow-hidden rounded-full border border-white/20 bg-[#2a2a2e]">
          <Image
            src="/worm-app-2/logos/avatar.png"
            alt=""
            fill
            className="object-cover"
            sizes="40px"
          />
        </div>
        <div>
          <p className="text-[24px] font-semibold leading-[1.25] text-white">
            $0
            <span className="text-white/40">.00</span>
          </p>
          <p className="text-[13px] font-semibold leading-[19.5px] text-[#00d54b]">
            +$0.00(+0%)
          </p>
        </div>
      </div>
      <button
        type="button"
        className="mt-1 flex h-12 items-center rounded-full bg-white/10 px-[21px] text-[15px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
      >
        Deposit
      </button>
    </header>
  );
}

function PicksChip({ picks }: { picks: ComboPick[] }) {
  const count = picks.length;
  const empty = count === 0;
  const logos = picks.slice(-MAX_CHIP_LOGOS);
  const label = empty
    ? "Build a Combo"
    : count === 1
      ? "1 pick"
      : `${count} picks`;
  const prevCount = useRef(count);

  useEffect(() => {
    prevCount.current = count;
  }, [count]);

  const bump = count > prevCount.current;

  return (
    <motion.button
      type="button"
      data-combo-chip
      layout
      animate={bump ? { scale: [1, 1.04, 1] } : { scale: 1 }}
      transition={{
        layout: { type: "spring", stiffness: 420, damping: 36, mass: 0.75 },
        scale: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
      }}
      className="inline-flex min-h-12 items-center justify-center gap-3.5 overflow-hidden rounded-full bg-[rgba(20,20,20,0.8)] px-6 py-3.5 backdrop-blur-[10px]"
    >
      <span className="relative inline-grid text-[16px] font-medium tabular-nums text-white">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="col-start-1 row-start-1"
          >
            {label}
          </motion.span>
        </AnimatePresence>
      </span>
      <AnimatePresence initial={false} mode="popLayout">
        {logos.map((pick) => (
          <motion.span
            key={pick.id}
            layout
            initial={{ opacity: 0, scale: 0.35, x: 14 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.35, x: -10 }}
            transition={{ type: "spring", stiffness: 520, damping: 30, mass: 0.65 }}
            className="inline-flex size-6 shrink-0"
          >
            <OptionEmblem
              logo={pick.logo}
              mark={pick.mark}
              label={pick.label}
              size={24}
            />
          </motion.span>
        ))}
      </AnimatePresence>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <motion.img
        layout
        src="/worm-app-2/icons/chevron.svg"
        alt=""
        width={10}
        height={5}
        className="h-1.5 w-2.5 shrink-0 rotate-180 opacity-80"
      />
    </motion.button>
  );
}

function TabBar({ hidden }: { hidden: boolean }) {
  const itemClass =
    "relative flex h-full min-w-0 flex-1 items-center justify-center rounded-full";

  return (
    <motion.nav
      aria-label="Main sections"
      aria-hidden={hidden}
      inert={hidden ? true : undefined}
      initial={false}
      animate={{
        y: hidden ? 88 : 0,
        opacity: hidden ? 0 : 1,
      }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={`mx-auto mt-4 flex h-16 w-full max-w-[360px] items-center rounded-full bg-black/70 p-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.08] will-change-transform ${
        hidden ? "pointer-events-none" : ""
      }`}
    >
      <button
        type="button"
        aria-label="Home"
        aria-current="page"
        className={itemClass}
      >
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-white/[0.14]"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/worm-app-2/icons/home.svg"
          alt=""
          width={28}
          height={28}
          className="relative z-[1] size-7"
        />
      </button>
      <button
        type="button"
        aria-label="Search"
        className={`${itemClass} text-white/55`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/worm-app-2/icons/search.svg"
          alt=""
          width={28}
          height={28}
          className="size-7 opacity-55"
        />
      </button>
      <button
        type="button"
        aria-label="Positions, 5 open"
        className={itemClass}
      >
        <span className="relative flex h-9 min-w-9 items-center justify-center overflow-hidden rounded-[12px] px-2.5 text-[16px] font-semibold tabular-nums text-white">
          <span
            aria-hidden
            className="absolute inset-0 rounded-[12px] bg-[#1f8f45]/35 shadow-[inset_0_0_16px_rgba(59,181,104,0.85)]"
          />
          <span className="relative z-[1]">5</span>
        </span>
      </button>
      <button
        type="button"
        aria-label="Pulse"
        className={`${itemClass} text-white/55`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/worm-app-2/icons/users.svg"
          alt=""
          width={26}
          height={26}
          className="size-[26px] opacity-55"
        />
      </button>
      <button
        type="button"
        aria-label="Rewards"
        className={`${itemClass} text-white/55`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/worm-app-2/icons/glyph.svg"
          alt=""
          width={28}
          height={28}
          className="size-7 opacity-55"
        />
      </button>
    </motion.nav>
  );
}

/** Owns scroll-hide state so market cards don't re-render on every toggle. */
function BottomChrome({
  feedRef,
  picks,
}: {
  feedRef: RefObject<HTMLDivElement | null>;
  picks: ComboPick[];
}) {
  const [tabHidden, setTabHidden] = useState(false);
  const lastScrollY = useRef(0);
  const hiddenRef = useRef(false);

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;

    const onScroll = () => {
      const y = feed.scrollTop;
      const delta = y - lastScrollY.current;
      lastScrollY.current = y;

      let next = hiddenRef.current;
      if (y < 20) next = false;
      else if (delta > 8) next = true;
      else if (delta < -8) next = false;

      if (next === hiddenRef.current) return;
      hiddenRef.current = next;
      setTabHidden(next);
    };

    feed.addEventListener("scroll", onScroll, { passive: true });
    return () => feed.removeEventListener("scroll", onScroll);
  }, [feedRef]);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent"
      />
      <div className="pointer-events-auto relative flex flex-col items-center px-7 pb-[max(28px,env(safe-area-inset-bottom,0px))]">
        {/* Drop into the tab bar slot when the bar hides — transform only. */}
        <motion.div
          initial={false}
          animate={{ y: tabHidden ? 80 : 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="will-change-transform"
        >
          <PicksChip picks={picks} />
        </motion.div>
        <TabBar hidden={tabHidden} />
      </div>
    </div>
  );
}

export default function MainFeed() {
  const [comboPicks, setComboPicks] = useState<ComboPick[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);
  const selectedIds = useMemo(
    () => new Set(comboPicks.map((pick) => pick.id)),
    [comboPicks],
  );
  const atLimit = comboPicks.length >= MAX_COMBO_PICKS;

  const togglePick = (pick: ComboPick) => {
    setComboPicks((prev) => {
      const exists = prev.some((item) => item.id === pick.id);
      if (exists) {
        return prev.filter((item) => item.id !== pick.id);
      }
      // Same game card: swap to the newly chosen side.
      const withoutGroup = prev.filter((item) => item.groupId !== pick.groupId);
      if (withoutGroup.length >= MAX_COMBO_PICKS) return prev;
      return [...withoutGroup, pick];
    });
  };

  return (
    <SportsVideoLockProvider>
      <div
        className={`relative h-full w-full bg-black motion-safe:[&_button:not([data-combo-chip])]:origin-center motion-safe:[&_button:not([data-combo-chip])]:transition-transform motion-safe:[&_button:not([data-combo-chip])]:duration-150 motion-safe:[&_button:not([data-combo-chip])]:ease-out motion-safe:[&_button:not([data-combo-chip]):active]:scale-[0.96] ${instrumentSans.className}`}
      >
        <div
          ref={feedRef}
          className="h-full overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{
            paddingBottom: "calc(144px + env(safe-area-inset-bottom, 0px))",
          }}
        >
          <FeedHeader />
          <div className="mt-6 flex flex-col gap-6 px-2">
            {MARKETS.map((market) => (
              <MarketPreview
                key={market.id}
                market={market}
                selectedIds={selectedIds}
                atLimit={atLimit}
                onToggle={togglePick}
              />
            ))}
          </div>
        </div>

        <BottomChrome feedRef={feedRef} picks={comboPicks} />
      </div>
    </SportsVideoLockProvider>
  );
}
