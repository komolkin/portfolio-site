"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

export const ui = {
  shell: "bg-black text-white",
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
}: {
  tabs: readonly { id: T; label: string; count?: number | string }[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="flex gap-5" role="tablist" aria-label={ariaLabel}>
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
            className={`inline-flex items-baseline gap-0.5 px-0 pb-1 text-[20px] font-semibold tracking-[-0.03em] ${
              isActive
                ? "text-white"
                : "text-white/55 hover:text-white/80"
            }`}
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

const iconTapBtn =
  "flex h-10 w-10 items-center justify-center rounded-full bg-transparent text-white";
const iconGlyph = "h-[21px] w-[21px]";

export function BlurBackButton({
  onClick,
  label = "Back",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      data-sfx="click"
      className={iconTapBtn}
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
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Share"
      data-sfx="click"
      className={iconTapBtn}
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
}: {
  leading: ReactNode;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onClick?: () => void;
}) {
  const className =
    "flex w-full items-center gap-3 px-0 py-3.5 text-left";
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
  const duration = reduceMotion ? 0 : fill ? 0.42 : 0.38;
  const transition = { duration, ease: SHEET_STEP_EASE };
  const enterX = fill ? 80 : 18;
  const exitX = fill ? 56 : 14;
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
            x: fill ? `${dir * 100}%` : dir * enterX,
            opacity: fill ? 1 : 0,
          }),
          center: { x: 0, opacity: 1 },
          exit: (dir: 1 | -1) => ({
            x: fill ? `${dir * -28}%` : dir * -exitX,
            opacity: fill ? 1 : 0,
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
          }),
        }}
        transition={transition}
        className={fill ? "flex h-full min-h-0 flex-col" : "w-full"}
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
