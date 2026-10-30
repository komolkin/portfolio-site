"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { instrumentSans } from "@/lib/fonts";
import UserAvatar from "./UserAvatar";

const FILTER_SHEET_CLOSE_PX = 72;

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
}: {
  value: T;
  onChange: (id: T) => void;
  options: readonly { id: T; label: string }[];
  ariaLabel: string;
  triggerClassName?: string;
  /** @deprecated Sheets replace menus; kept for call-site compat. */
  menuAlign?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [drawerOffset, setDrawerOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const dragStartOffset = useRef(0);
  const closeTimerRef = useRef<number | null>(null);
  const active = options.find((option) => option.id === value) ?? options[0];

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const closeSheet = () => {
    setSheetVisible(false);
    setDrawerOffset(0);
    setIsDragging(false);
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      setPortalTarget(null);
    }, 280);
  };

  const closeSheetRef = useRef(closeSheet);
  closeSheetRef.current = closeSheet;

  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => setSheetVisible(true));
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSheetRef.current();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(id);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
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
    if (drawerOffset > FILTER_SHEET_CLOSE_PX) {
      closeSheet();
      return;
    }
    setDrawerOffset(0);
  };

  const sheet =
    open && portalTarget
      ? createPortal(
          <div className="absolute inset-0 z-50">
            <div
              className={`absolute inset-0 ${ui.backdrop} transition-opacity duration-300 ${
                sheetVisible ? "opacity-100" : "opacity-0"
              }`}
              onClick={closeSheet}
              aria-hidden
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label={ariaLabel}
              className={`absolute inset-x-0 bottom-0 flex max-h-[70%] flex-col overflow-hidden rounded-t-[1.75rem] ${ui.sheet} shadow-[0_-12px_40px_rgba(0,0,0,0.45)]`}
              style={{
                transform: sheetVisible
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
                <h2 className="text-[20px] font-semibold tracking-[-0.03em]">
                  {ariaLabel}
                </h2>
              </div>
              <div
                role="listbox"
                aria-label={ariaLabel}
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                <div className="flex flex-col gap-1">
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
                          closeSheet();
                        }}
                        className={`flex w-full items-center rounded-2xl px-3.5 py-3.5 text-left text-[16px] font-semibold transition-colors ${
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
              </div>
            </div>
          </div>,
          portalTarget,
        )
      : null;

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-sfx="click"
        onClick={() => {
          if (open) {
            closeSheet();
            return;
          }
          const host =
            rootRef.current?.closest("article") ??
            rootRef.current?.closest("[data-api-shell]");
          if (!(host instanceof HTMLElement)) return;
          setPortalTarget(host);
          setSheetVisible(false);
          setDrawerOffset(0);
          setOpen(true);
        }}
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
      {sheet}
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
  "flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.06] bg-[linear-gradient(145deg,rgba(255,255,255,0.14),rgba(255,255,255,0.03))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_6px_20px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-[transform,background-color] duration-150 active:scale-95";
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

const SHEET_STEP_EASE = [0.22, 1, 0.36, 1] as const;

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
  const duration = reduceMotion ? 0 : fill ? 0.4 : 0.42;
  const transition = {
    duration,
    ease: SHEET_STEP_EASE,
    opacity: { duration: reduceMotion ? 0 : duration * 0.85 },
  };
  const enterX = fill ? 22 : 16;
  const exitX = fill ? 16 : 12;
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
    <AnimatePresence mode="sync" initial={false} custom={direction}>
      <motion.div
        key={step}
        ref={fill ? undefined : pageRef}
        custom={direction}
        initial={reduceMotion ? false : "enter"}
        animate="center"
        exit="exit"
        variants={{
          enter: (dir: 1 | -1) => ({
            x: dir * enterX,
            opacity: 0,
          }),
          center: {
            x: 0,
            opacity: 1,
          },
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
                }
              : {}),
          }),
        }}
        transition={transition}
        className={
          fill
            ? "flex h-full min-h-0 flex-col will-change-[transform,opacity]"
            : "w-full"
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

export type FollowToastData = {
  id: number;
  action: "Followed" | "Unfollowed";
  name: string;
  wallet: string;
  avatarUrl?: string | null;
};

export function FollowToast({
  toast,
}: {
  toast: FollowToastData | null;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[70] flex justify-center px-4 pt-14">
      <AnimatePresence mode="popLayout">
        {toast ? (
          <motion.div
            key={toast.id}
            role="status"
            aria-live="polite"
            initial={reduceMotion ? false : { y: -28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={
              reduceMotion
                ? { opacity: 0 }
                : { y: -28, opacity: 0, transition: { duration: 0.22 } }
            }
            transition={{
              duration: 0.32,
              ease: [0.32, 0.72, 0, 1],
            }}
            className="inline-flex max-w-[min(100%,300px)] items-center gap-1.5 overflow-hidden rounded-full bg-black/55 py-2 pl-4 pr-4 text-[13px] font-semibold text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.28),inset_0_-2px_4px_rgba(0,0,0,0.4),0_8px_28px_rgba(0,0,0,0.35)] ring-1 ring-white/[0.06] backdrop-blur-xl"
          >
            <span className="shrink-0 text-white/90">{toast.action}</span>
            <UserAvatar
              seed={toast.wallet}
              label={toast.name}
              src={toast.avatarUrl}
              className="h-5 w-5 shrink-0"
            />
            <span className="min-w-0 truncate">{toast.name}</span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
