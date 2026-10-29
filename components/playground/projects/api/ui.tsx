"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { instrumentSans } from "@/lib/fonts";

export const ui = {
  shell: "bg-black text-white",
  backdrop: "bg-black/60",
  sheet: "bg-[#1c1c1e]",
  surface: "rounded-[24px] bg-white/[0.08]",
  surfacePad: "rounded-[24px] bg-white/[0.08] px-4 py-4",
  pillPrimary:
    "rounded-full bg-white py-3.5 text-[15px] font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40",
  pillSecondary:
    "rounded-full bg-white/[0.1] py-3.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90",
  pillYes:
    "rounded-full bg-[#00D54B] py-3.5 text-[15px] font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40",
  pillNo:
    "rounded-full bg-[#FF375F] py-3.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40",
  title: "text-[34px] font-semibold leading-none tracking-[-0.05em]",
  section: "text-[20px] font-semibold tracking-[-0.03em]",
  muted: "text-[13px] text-white/55",
  gain: "text-[#00D54B]",
  loss: "text-[#FF375F]",
} as const;

export function ChipTabs<T extends string>({
  tabs,
  value,
  onChange,
  ariaLabel,
  underline = false,
  fullWidth = false,
}: {
  tabs: readonly { id: T; label: string; count?: number | string }[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
  underline?: boolean;
  /** Equal-width tabs with a full-bleed underline (reference: Markets / Top performers). */
  fullWidth?: boolean;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(
    null,
  );
  const tabsKey = tabs.map((tab) => `${tab.id}:${tab.label}:${tab.count ?? ""}`).join("|");

  useLayoutEffect(() => {
    if (!underline) return;
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const active = list.querySelector<HTMLElement>('[aria-selected="true"]');
      if (!active) return;
      setIndicator((prev) =>
        prev && prev.left === active.offsetLeft && prev.width === active.offsetWidth
          ? prev
          : { left: active.offsetLeft, width: active.offsetWidth },
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    return () => ro.disconnect();
  }, [underline, value, tabsKey]);

  return (
    <div
      ref={listRef}
      className={`relative flex ${fullWidth ? "w-full" : "gap-5"} ${
        underline ? "border-b border-white/[0.08]" : ""
      }`}
      role="tablist"
      aria-label={ariaLabel}
    >
      {underline && indicator ? (
        <span
          aria-hidden
          className={`pointer-events-none absolute -bottom-px left-0 rounded-full bg-white transition-[transform,width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${
            fullWidth ? "h-px" : "h-0.5"
          }`}
          style={{
            width: indicator.width,
            transform: `translateX(${indicator.left}px)`,
          }}
        />
      ) : null}
      {tabs.map((tab) => {
        const isActive = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            data-sfx="click"
            data-sfx-hover="tick"
            onClick={() => onChange(tab.id)}
            className={`${
              fullWidth
                ? "flex flex-1 items-center justify-center gap-0.5 text-[15px] tracking-[-0.02em]"
                : "inline-flex items-baseline gap-0.5 text-[20px] tracking-[-0.03em]"
            } px-0 font-semibold transition-colors duration-200 ${
              underline ? "pb-2.5" : "pb-1"
            } ${isActive ? "text-white" : "text-white/55 hover:text-white/80"}`}
          >
            {tab.label}
            {tab.count != null && tab.count !== 0 ? (
              <span
                className={`relative -top-[0.7em] text-[11px] font-semibold tabular-nums leading-none ${
                  isActive ? "text-white/45" : "text-white/30"
                }`}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function FilterDropdown<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  triggerClassName,
  menuAlign = "left",
}: {
  value: T;
  onChange: (id: T) => void;
  options: readonly { id: T; label: string }[];
  ariaLabel: string;
  triggerClassName?: string;
  menuAlign?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = options.find((option) => option.id === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        data-sfx="click"
        onClick={() => setOpen((prev) => !prev)}
        className={
          triggerClassName ??
          "inline-flex max-w-full items-center gap-1 text-[15px] font-semibold tracking-[-0.02em] text-white"
        }
      >
        <span className="truncate">{active?.label}</span>
        <svg
          viewBox="0 0 12 12"
          fill="none"
          className={`h-3 w-3 shrink-0 text-white/45 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        >
          <path
            d="M3 4.5 6 7.5 9 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open ? (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className={`absolute top-[calc(100%+6px)] z-30 min-w-[148px] overflow-hidden rounded-2xl bg-[#1c1c1e] py-1 shadow-[0_12px_40px_rgba(0,0,0,0.55)] ring-1 ring-white/10 ${
            menuAlign === "right" ? "right-0" : "left-0"
          }`}
        >
          {options.map((option) => {
            const selected = option.id === value;
            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={selected}
                data-sfx="click"
                onClick={() => {
                  onChange(option.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center px-3.5 py-2.5 text-left text-[14px] font-semibold ${
                  selected
                    ? "bg-white/10 text-white"
                    : "text-white/70 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/** Horizontal scroll-snap pager synced with tab selection. */
export function SwipeablePages<T extends string>({
  value,
  onChange,
  pages,
  bleed = true,
}: {
  value: T;
  onChange: (id: T) => void;
  pages: readonly { id: T; content: ReactNode }[];
  /** Extend into parent horizontal padding (default true). */
  bleed?: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pageIdsKey = pages.map((page) => page.id).join("|");
  const activeIndex = Math.max(
    0,
    pages.findIndex((page) => page.id === value),
  );
  const syncingRef = useRef(false);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  valueRef.current = value;
  onChangeRef.current = onChange;

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const width = el.clientWidth;
    if (width <= 0) return;
    const target = activeIndex * width;
    if (Math.abs(el.scrollLeft - target) < 2) return;
    syncingRef.current = true;
    el.scrollTo({ left: target, behavior: "smooth" });
    const release = window.setTimeout(() => {
      syncingRef.current = false;
    }, 420);
    return () => window.clearTimeout(release);
  }, [activeIndex, pageIdsKey]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const ids = pageIdsKey.split("|") as T[];

    const syncFromScroll = () => {
      if (syncingRef.current) return;
      const width = el.clientWidth;
      if (width <= 0) return;
      const nextIndex = Math.round(el.scrollLeft / width);
      const nextId = ids[nextIndex];
      if (nextId && nextId !== valueRef.current) onChangeRef.current(nextId);
    };

    let frame = 0;
    const onScroll = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(syncFromScroll);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      el.removeEventListener("scroll", onScroll);
    };
  }, [pageIdsKey]);

  return (
    <div
      ref={scrollerRef}
      className={`flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
        bleed ? "-mx-5 w-[calc(100%+2.5rem)]" : "w-full"
      }`}
      style={{ touchAction: "pan-x pan-y" }}
    >
      {pages.map((page) => (
        <div
          key={page.id}
          role="tabpanel"
          aria-hidden={page.id !== value}
          className={`shrink-0 grow-0 basis-full snap-center snap-always ${
            bleed ? "px-5" : ""
          }`}
          style={{ width: "100%", flex: "0 0 100%" }}
        >
          {page.content}
        </div>
      ))}
    </div>
  );
}

const iconTapBtn =
  "flex h-10 w-10 items-center justify-center rounded-full bg-transparent text-white";
const iconCircleBtn =
  "flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.14] bg-[linear-gradient(145deg,rgba(255,255,255,0.14),rgba(255,255,255,0.03))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_6px_20px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-[transform,background-color] duration-150 active:scale-95";
const iconGlyph = "h-[21px] w-[21px]";

export function BlurBackButton({
  onClick,
  label = "Back",
  circle = false,
}: {
  onClick: () => void;
  label?: string;
  /** Glass circle backdrop (market page over imagery). */
  circle?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      data-sfx="click"
      className={circle ? iconCircleBtn : iconTapBtn}
    >
      <svg
        viewBox="0 0 16 16"
        fill="none"
        className={iconGlyph}
        aria-hidden
      >
        <path
          d="M10 3.5L5.5 8L10 12.5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export function BlurShareButton({
  onClick,
  circle = false,
}: {
  onClick: () => void;
  circle?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Share"
      data-sfx="click"
      className={circle ? iconCircleBtn : iconTapBtn}
    >
      <svg viewBox="0 0 16 16" fill="none" className={iconGlyph} aria-hidden>
        <path
          d="M8 10V3M8 3 5.5 5.5M8 3l2.5 2.5M3.5 9v3.5a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V9"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export function ActivityRow({
  leading,
  title,
  subtitle,
  trailing,
  onClick,
  compact = false,
}: {
  leading: ReactNode;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onClick?: () => void;
  compact?: boolean;
}) {
  const className = `flex w-full items-center gap-3 px-0 text-left ${
    compact ? "py-2" : "py-3.5"
  }`;
  const body = (
    <>
      <div className="shrink-0">{leading}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[16px] font-semibold leading-snug">{title}</p>
        {subtitle ? (
          <p className="mt-0.5 truncate text-[13px] text-white/55">{subtitle}</p>
        ) : null}
      </div>
      {trailing ? <div className="shrink-0 text-right">{trailing}</div> : null}
    </>
  );

  if (onClick) {
    return (
      <button type="button" data-sfx="click" onClick={onClick} className={className}>
        {body}
      </button>
    );
  }

  return <div className={className}>{body}</div>;
}

const SHEET_STEP_EASE = [0.32, 0.72, 0, 1] as const;

const KEYPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"] as const;

/** Appends a keypad key to a digit string, capped at `max`. */
export function applyAmountKey(prev: string, key: string, max: number): string {
  if (key === "back") return prev.slice(0, -1);
  const next = (prev === "0" ? "" : prev) + key;
  if (next === "0") return "";
  return Number(next) > max ? prev : next;
}

function DeleteKeyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M8.6 5.5H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8.6a2 2 0 0 1-1.52-.7L3 12l4.08-5.8a2 2 0 0 1 1.52-.7Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M11 9.5l5 5M16 9.5l-5 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AmountKeypad({
  onKey,
  className = "",
}: {
  onKey: (key: string) => void;
  className?: string;
}) {
  return (
    <div
      className={`grid shrink-0 grid-cols-3 ${className}`}
      role="group"
      aria-label="Amount keypad"
    >
      {KEYPAD_KEYS.map((key) =>
        key === "" ? (
          <span key="blank" aria-hidden />
        ) : (
          <button
            key={key}
            type="button"
            aria-label={key === "back" ? "Delete" : key}
            onClick={() => onKey(key)}
            className={`flex h-[52px] items-center justify-center rounded-2xl text-[26px] font-semibold text-white transition-colors active:bg-white/[0.06] ${instrumentSans.className}`}
          >
            {key === "back" ? <DeleteKeyIcon className="h-6 w-6" /> : key}
          </button>
        ),
      )}
    </div>
  );
}

export function SheetPager({
  step,
  direction,
  fill = false,
  children,
}: {
  step: string;
  direction: 1 | -1;
  fill?: boolean;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const duration = reduceMotion ? 0 : fill ? 0.28 : 0.38;
  const transition = { duration, ease: SHEET_STEP_EASE };
  const enterX = fill ? 32 : 18;
  const exitX = fill ? 24 : 14;
  const pageRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (fill) return;
    const el = pageRef.current;
    if (!el) return;

    const update = () => {
      const next = el.offsetHeight;
      setHeight((prev) => (prev === next ? prev : next));
    };
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [step, fill]);

  const page = (
    <AnimatePresence
      mode={fill ? "wait" : "sync"}
      initial={false}
      custom={direction}
    >
      <motion.div
        key={step}
        ref={fill ? undefined : pageRef}
        custom={direction}
        initial={reduceMotion ? false : "enter"}
        animate="center"
        exit="exit"
        variants={{
          enter: (dir: 1 | -1) => ({ x: dir * enterX, opacity: 0 }),
          center: { x: 0, opacity: 1 },
          exit: (dir: 1 | -1) => ({
            x: dir * -exitX,
            opacity: 0,
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            ...(fill
              ? {
                  height: "100%",
                  pointerEvents: "none" as const,
                  transition: { duration: reduceMotion ? 0 : 0.14, ease: "easeIn" },
                }
              : {}),
          }),
        }}
        transition={transition}
        className={
          fill ? "flex h-full min-h-0 flex-col will-change-[transform,opacity]" : "w-full"
        }
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );

  if (fill) {
    return (
      <div className="relative h-full min-h-0 overflow-hidden">{page}</div>
    );
  }

  return (
    <motion.div
      className="relative overflow-hidden"
      initial={false}
      animate={height == null ? undefined : { height }}
      transition={transition}
    >
      {page}
    </motion.div>
  );
}
