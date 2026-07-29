"use client";

import dynamic from "next/dynamic";
import NumberFlow from "@number-flow/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { McpPointerRef } from "@/components/playground/projects/mcp/McpCanvas3D";
import {
  pushTextWords,
  StreamingWords,
  type StreamingWord,
} from "@/components/StreamingWords";

const McpCanvas3D = dynamic(
  () => import("@/components/playground/projects/mcp/McpCanvas3D"),
  { ssr: false },
);

export const SMART_LEVERAGE_STEPS = [1, 2, 3, 4, 5] as const;

const MAX_LEVERAGE_MESSAGES: Record<(typeof SMART_LEVERAGE_STEPS)[number], string> = {
  1: "Spread is tight. Safe to trade.",
  2: "Spread's holding steady at 2x. Good to go.",
  3: "Spread is wide max leverage is 3x",
  4: "4x is within a safe range. No spread concerns.",
  5: "Spread checks out even at 5x. Clear to trade.",
};

/** Full 1×→5× risk spectrum (matches Figma gradient stops, left = safe). */
const LEVERAGE_RISK_COLORS: Record<(typeof SMART_LEVERAGE_STEPS)[number], string> = {
  1: "rgb(9, 255, 0)",
  2: "rgb(255, 175, 0)",
  3: "rgb(255, 183, 0)",
  4: "rgb(255, 81, 0)",
  5: "rgb(255, 0, 0)",
};

function maxLeverageGradient(maxLeverage: (typeof SMART_LEVERAGE_STEPS)[number]) {
  if (maxLeverage <= 1) return "rgba(255, 255, 255, 0.2)";
  const start = LEVERAGE_RISK_COLORS[1];
  const end = LEVERAGE_RISK_COLORS[maxLeverage];
  return `linear-gradient(to right, ${start}, ${end})`;
}

/** Figma leverage slider — node 3887:4067 */
const SLIDER_FRAME_HEIGHT_PX = 62;
const TRACK_TOP_PX = 7;
const TRACK_HEIGHT_PX = 55;
/** Uniform inset for thumb + fill inside the track (top, bottom, left, right). */
const THUMB_INSET_PX = 5;
const THUMB_TOP_PX = TRACK_TOP_PX + THUMB_INSET_PX;
const THUMB_BOTTOM_PX = THUMB_INSET_PX;
const THUMB_WIDTH_PX = 8;

function McpSphereMini({ pointerRef }: { pointerRef: McpPointerRef }) {
  const areaRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(40);

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;

    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      const next = Math.round(Math.min(width, height));
      if (next > 0) setSize(next);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={areaRef}
      className="relative aspect-square size-10 min-h-10 min-w-10 shrink-0 overflow-hidden rounded-full bg-white/[0.08]"
      aria-hidden
    >
      <McpCanvas3D pointer={pointerRef} width={size} height={size} accent="grey" />
    </div>
  );
}

function LeverageStatusMessage({ maxLeverage }: { maxLeverage: number }) {
  const animatedWordKeysRef = useRef<Set<string>>(new Set());

  const words = useMemo(() => {
    const text =
      MAX_LEVERAGE_MESSAGES[maxLeverage as (typeof SMART_LEVERAGE_STEPS)[number]] ??
      MAX_LEVERAGE_MESSAGES[1];
    const nextWords: StreamingWord[] = [];
    const delayIndex = { current: 0 };
    pushTextWords(nextWords, `max-${maxLeverage}`, text, delayIndex);
    return nextWords;
  }, [maxLeverage]);

  useEffect(() => {
    animatedWordKeysRef.current.clear();
  }, [maxLeverage]);

  return (
    <p className="min-w-0 max-w-[200px] text-pretty text-base leading-[1.25] text-white">
      <StreamingWords words={words} animatedWordKeysRef={animatedWordKeysRef} />
    </p>
  );
}

type SmartLeverageSectionProps = {
  maxLeverage: (typeof SMART_LEVERAGE_STEPS)[number];
  leverageIdx: number;
  onLeverageIdxChange: (idx: number) => void;
  isDragging: boolean;
  onDraggingChange: (dragging: boolean) => void;
};

export default function SmartLeverageSection({
  maxLeverage,
  leverageIdx,
  onLeverageIdxChange,
  isDragging,
  onDraggingChange,
}: SmartLeverageSectionProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const pointerRef = useRef<McpPointerRef["current"]>({ x: 0, y: 0 });

  const maxLeverageIdx = maxLeverage - 1;
  const leverage = SMART_LEVERAGE_STEPS[Math.min(leverageIdx, maxLeverageIdx)];
  /** Interior step indices only — no dots at min (1×) or max positions. */
  const interiorStepIndices =
    maxLeverageIdx <= 1
      ? []
      : Array.from({ length: maxLeverageIdx - 1 }, (_, i) => i + 1);
  /** Map step index to 0–1 across the current max leverage range (always start → end). */
  const stepRatio = (index: number) =>
    maxLeverageIdx <= 0 ? 0 : index / maxLeverageIdx;
  const ratio = stepRatio(leverageIdx);
  const thumbTravel = `(100% - ${THUMB_INSET_PX * 2}px - ${THUMB_WIDTH_PX}px)`;
  const thumbLeft = `calc(${THUMB_INSET_PX}px + ${ratio} * ${thumbTravel})`;
  const fillWidth = `calc(${ratio} * ${thumbTravel} + ${THUMB_WIDTH_PX}px)`;
  const isSliderDisabled = maxLeverage <= 1;
  const riskGradient = useMemo(() => maxLeverageGradient(maxLeverage), [maxLeverage]);

  useEffect(() => {
    if (maxLeverage <= 1 && leverageIdx !== 0) {
      onLeverageIdxChange(0);
    }
  }, [maxLeverage, leverageIdx, onLeverageIdxChange]);

  useEffect(() => {
    if (leverageIdx > maxLeverageIdx) {
      onLeverageIdxChange(maxLeverageIdx);
    }
  }, [leverageIdx, maxLeverageIdx, onLeverageIdxChange]);

  useEffect(() => {
    const updatePointerFromViewport = (clientX: number, clientY: number) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (w <= 0 || h <= 0) return;

      pointerRef.current = {
        x: (clientX / w) * 2 - 1,
        y: -((clientY / h) * 2 - 1),
      };
    };

    const handlePointerMove = (event: PointerEvent) => {
      updatePointerFromViewport(event.clientX, event.clientY);
    };

    const handlePointerLeave = (event: PointerEvent) => {
      if (event.relatedTarget !== null) return;
      pointerRef.current = { x: 0, y: 0 };
    };

    window.addEventListener("pointermove", handlePointerMove);
    document.documentElement.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      document.documentElement.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, []);

  const updateLeverageFromClientX = useCallback(
    (clientX: number) => {
      if (maxLeverage <= 1) return;
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      if (rect.width <= 0) return;

      const thumbHalfPx = THUMB_WIDTH_PX / 2;
      const usableWidth = Math.max(
        1,
        rect.width - THUMB_INSET_PX * 2 - THUMB_WIDTH_PX,
      );
      const raw = (clientX - rect.left - THUMB_INSET_PX - thumbHalfPx) / usableWidth;
      const clamped = Math.min(1, Math.max(0, raw));
      const nextIdx =
        maxLeverageIdx <= 0 ? 0 : Math.round(clamped * maxLeverageIdx);
      onLeverageIdxChange(nextIdx);
    },
    [maxLeverage, maxLeverageIdx, onLeverageIdxChange],
  );

  const startLeverageDrag = useCallback(
    (startX: number) => {
      if (maxLeverage <= 1) return;
      onDraggingChange(true);
      updateLeverageFromClientX(startX);

      const onMove = (event: PointerEvent) => {
        updateLeverageFromClientX(event.clientX);
      };
      const onUp = () => {
        onDraggingChange(false);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [maxLeverage, onDraggingChange, updateLeverageFromClientX],
  );

  const handleLeverageKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (isSliderDisabled) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      onLeverageIdxChange(Math.max(0, leverageIdx - 1));
      return;
    }
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      onLeverageIdxChange(Math.min(maxLeverageIdx, leverageIdx + 1));
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      onLeverageIdxChange(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      onLeverageIdxChange(maxLeverageIdx);
    }
  };

  return (
    <div className="flex w-full flex-col gap-2 rounded-3xl bg-white/[0.04] p-4">
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <McpSphereMini pointerRef={pointerRef} />
          <LeverageStatusMessage maxLeverage={maxLeverage} />
        </div>
        <span className="shrink-0 text-[36px] font-semibold leading-[1.25] text-white">
          <NumberFlow
            value={leverage}
            suffix="×"
            format={{ minimumFractionDigits: 0, maximumFractionDigits: 0 }}
            className="leading-[1.25]"
            style={{ ["--number-flow-mask-height" as string]: "0em" }}
          />
        </span>
      </div>

      <div
        className={`relative w-full ${isSliderDisabled ? "opacity-50" : ""}`}
        style={{ height: SLIDER_FRAME_HEIGHT_PX }}
      >
        <div
          className="absolute inset-x-0 rounded-md bg-white/10"
          style={{ top: TRACK_TOP_PX, height: TRACK_HEIGHT_PX }}
          aria-hidden
        />

        <div
          className={`pointer-events-none absolute rounded-[4px] bg-[#5b5b5b] shadow-[0_4px_16px_rgba(0,0,0,0.2)] ${
            isDragging ? "transition-none" : "transition-[width] duration-150 ease-out"
          }`}
          style={{
            top: THUMB_TOP_PX,
            bottom: THUMB_BOTTOM_PX,
            left: THUMB_INSET_PX,
            width: fillWidth,
          }}
          aria-hidden
        />

        {interiorStepIndices.map((i) => (
          <span
            key={SMART_LEVERAGE_STEPS[i]}
            className="pointer-events-none absolute size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/20"
            style={{
              top: TRACK_TOP_PX + TRACK_HEIGHT_PX / 2,
              left: `calc(${THUMB_INSET_PX}px + ${stepRatio(i)} * ${thumbTravel})`,
            }}
            aria-hidden
          />
        ))}

        <div
          className={`absolute z-10 rounded-[4px] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.2)] ${
            isSliderDisabled
              ? "cursor-not-allowed"
              : `cursor-grab active:cursor-grabbing ${
                  isDragging ? "transition-none" : "transition-[left] duration-150 ease-out"
                }`
          }`}
          style={{
            top: THUMB_TOP_PX,
            bottom: THUMB_BOTTOM_PX,
            left: thumbLeft,
            width: THUMB_WIDTH_PX,
          }}
          onPointerDown={(event) => {
            if (isSliderDisabled) return;
            event.preventDefault();
            startLeverageDrag(event.clientX);
          }}
          aria-hidden
        />

        <div
          ref={trackRef}
          tabIndex={isSliderDisabled ? -1 : 0}
          className={`absolute inset-x-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
            isSliderDisabled ? "cursor-not-allowed" : "cursor-pointer"
          }`}
          style={{ top: TRACK_TOP_PX, height: TRACK_HEIGHT_PX }}
          role="slider"
          aria-disabled={isSliderDisabled}
          aria-valuemin={1}
          aria-valuemax={maxLeverage}
          aria-valuenow={leverage}
          aria-valuetext={`${leverage}×`}
          aria-label="Leverage"
          onKeyDown={handleLeverageKeyDown}
          onPointerDown={(event) => {
            if (isSliderDisabled) return;
            event.preventDefault();
            startLeverageDrag(event.clientX);
          }}
        >
          {!isSliderDisabled &&
            SMART_LEVERAGE_STEPS.slice(0, maxLeverage).map((step, i) => (
              <button
                key={step}
                type="button"
                onClick={() => onLeverageIdxChange(i)}
                className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                style={{
                  left: `calc(${THUMB_INSET_PX}px + ${stepRatio(i)} * ${thumbTravel})`,
                }}
                aria-label={`Leverage ${step}×`}
              />
            ))}
        </div>
      </div>

      <div
        className="h-1 w-full rounded-lg transition-[background] duration-300 ease-out"
        style={{ background: riskGradient }}
        aria-hidden
      />

      <div className="flex w-full items-start justify-between text-xs font-semibold leading-[1.25] text-white/60">
        <span className="w-6 text-center">1×</span>
        {maxLeverage > 1 ? (
          <span className="w-6 text-center">
            <NumberFlow
              value={maxLeverage}
              suffix="×"
              format={{ minimumFractionDigits: 0, maximumFractionDigits: 0 }}
              className="leading-[1.25]"
              style={{ ["--number-flow-mask-height" as string]: "0em" }}
            />
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function smartLeverageFromIdx(idx: number): number {
  return SMART_LEVERAGE_STEPS[Math.min(Math.max(0, idx), SMART_LEVERAGE_STEPS.length - 1)];
}
