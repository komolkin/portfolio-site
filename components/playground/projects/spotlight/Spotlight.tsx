"use client";

import { useCallback, useEffect, useState } from "react";
import { DotGrid } from "@paper-design/shaders-react";
import { AnimatePresence, motion } from "framer-motion";

// Paper Shaders — https://github.com/paper-design/shaders

const SLIDE_MS = 4000;

const EASE_SLIDE = [0.22, 1, 0.36, 1] as const;

const transitionContent = {
  duration: 0.38,
  ease: EASE_SLIDE,
} as const;

const transitionDot = {
  duration: 0.32,
  ease: EASE_SLIDE,
} as const;

/** Dots + progress line in pure white shades */
const DOT_INACTIVE_BG = "rgba(255, 255, 255, 0.35)";
const DOT_TRACK_BG = "rgba(255, 255, 255, 0.16)";

const SPOTLIGHT_BG = "#000000";

/** Figma 1486:26533 — https://www.figma.com/design/XSjBMcMS96jS8ntZIpMukQ/Ilya?node-id=1486-26533 */
const IMG_5X_LEVERAGE =
  "https://www.figma.com/api/mcp/asset/919d7c83-7d5f-4743-8457-be3376de720b";

/** Figma 1486:26534 — Worm AI / EARN art */
const IMG_WORM_AI =
  "https://www.figma.com/api/mcp/asset/7216855e-0e74-4700-988d-5e3611dc13f9";

/** Figma 1486:26532 — Sports art */
const IMG_SPORTS =
  "https://www.figma.com/api/mcp/asset/f709bbc5-bba0-42a7-88b7-0eb6610dee9c";

type SpotlightSlide = {
  title: string;
  subtitle?: string;
  cta?: string;
  /** Optional right-side image; column is 60% width × full height, image inset inside (see markup) */
  imageSrc?: string;
};

const SLIDES: ReadonlyArray<SpotlightSlide> = [
  {
    title: "Trade with up to\n5x leverage",
    imageSrc: IMG_5X_LEVERAGE,
  },
  {
    title: "Create markets to earn 2.5% fees",
    imageSrc: IMG_WORM_AI,
  },
  {
    title: "Trade your sports beliefs",
    imageSrc: IMG_SPORTS,
  },
];

const SLIDE_IMAGE_URLS = SLIDES.map((s) => s.imageSrc).filter(
  (src): src is string => Boolean(src),
);

export default function Spotlight() {
  const [index, setIndex] = useState(0);

  /** Warm HTTP cache once; images stay mounted below (no remount per slide). */
  useEffect(() => {
    const loaders = SLIDE_IMAGE_URLS.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = src;
        }),
    );
    void Promise.allSettled(loaders);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, SLIDE_MS);
    return () => window.clearTimeout(id);
  }, [index]);

  const goTo = useCallback((i: number) => {
    setIndex(i);
  }, []);

  const handleSpotlightPress = useCallback(() => {
    // Per-slide links can be wired here later (e.g. router.push(slide.href)).
  }, []);

  const slide = SLIDES[index];

  return (
    <section
      className="relative h-[220px] w-[630px]"
      aria-roledescription="carousel"
      aria-label="Spotlight"
    >
      <button
        type="button"
        onClick={handleSpotlightPress}
        className="relative z-[2] flex h-full min-h-0 w-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-white/[0.08] text-left shadow-[0_8px_40px_rgba(0,0,0,0.45)] transition-[transform,box-shadow] selection:bg-white/20 active:scale-[0.992] active:shadow-[0_4px_24px_rgba(0,0,0,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
        style={{ backgroundColor: SPOTLIGHT_BG }}
        aria-label={`Spotlight: ${slide.title}`}
      >
        <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden rounded-2xl">
          <DotGrid
            width={630}
            height={220}
            colorBack="#000000"
            colorFill="#ffffff2e"
            colorStroke="#ffffff"
            size={1}
            gapX={20}
            gapY={20}
            strokeWidth={0}
            sizeRange={0}
            opacityRange={0}
            shape="circle"
            style={{ width: "100%", height: "100%", display: "block" }}
          />
        </div>

        {/* Subtle dark overlay to improve text readability over shaders */}
        <div
          className="pointer-events-none absolute inset-0 z-[1] rounded-2xl bg-black/40"
          aria-hidden
        />

        <div className="relative z-[2] flex h-full min-h-0 min-w-0 w-full flex-1 flex-col">
          <div className="relative flex h-full min-h-0 min-w-0 w-full flex-row">
            <div
              className={
                slide.imageSrc
                  ? "flex min-h-0 min-w-0 flex-1 flex-col justify-center overflow-hidden px-8 pr-4"
                  : "flex h-full w-full max-w-[315px] flex-col justify-center overflow-hidden px-8 pr-8"
              }
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={index}
                  className="flex flex-col gap-2"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 14 }}
                  transition={transitionContent}
                >
                  <h2 className="text-balance whitespace-pre-line text-2xl font-semibold leading-tight tracking-tight text-foreground">
                    {slide.title}
                  </h2>
                  {slide.subtitle ? (
                    <p className="text-pretty text-sm leading-snug text-muted-foreground">
                      {slide.subtitle}
                    </p>
                  ) : null}
                  {slide.cta ? (
                    <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                      <span
                        role="presentation"
                        className="inline-flex h-9 cursor-pointer items-center justify-center rounded-full border-0 bg-white px-4 text-sm font-medium text-black transition-colors hover:bg-white/90 active:scale-[0.98]"
                      >
                        {slide.cta}
                      </span>
                    </div>
                  ) : null}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Images stay mounted; only opacity changes — avoids reload/flicker when looping slides */}
            <div
              className={
                slide.imageSrc
                  ? "relative flex h-full w-[60%] shrink-0 items-center justify-center overflow-hidden"
                  : "pointer-events-none h-full w-0 shrink-0 overflow-hidden"
              }
              aria-hidden={!slide.imageSrc}
            >
              {SLIDES.map((s, i) =>
                s.imageSrc ? (
                  <img
                    key={i}
                    src={s.imageSrc}
                    alt=""
                    className={`pointer-events-none absolute left-1/2 top-1/2 h-auto max-h-[78%] w-auto max-w-[82%] -translate-x-1/2 -translate-y-1/2 select-none object-contain transition-opacity duration-300 ease-out ${
                      index === i ? "z-[1] opacity-100" : "z-0 opacity-0"
                    }`}
                    draggable={false}
                  />
                ) : null,
              )}
            </div>
          </div>
        </div>
      </button>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center"
        role="tablist"
        aria-label="Slides"
      >
        <div className="pointer-events-auto flex items-center justify-center gap-[8px]">
          {SLIDES.map((_, i) => {
            const active = i === index;
            return (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={`Slide ${i + 1}`}
                onClick={() => goTo(i)}
                className="inline-flex h-5 shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0 outline-none ring-offset-2 ring-offset-[#000000] focus-visible:ring-2 focus-visible:ring-white/40"
              >
                <motion.span
                  className="relative block overflow-hidden rounded-full"
                  initial={false}
                  animate={{
                    width: active ? 32 : 6,
                    height: 6,
                    backgroundColor: active ? DOT_TRACK_BG : DOT_INACTIVE_BG,
                  }}
                  transition={transitionDot}
                >
                  <AnimatePresence>
                    {active && (
                      <motion.span
                        key={index}
                        className="absolute inset-y-0 left-0 block w-full origin-left rounded-full bg-white/85"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{
                          scaleX: {
                            duration: SLIDE_MS / 1000,
                            ease: "linear",
                          },
                          opacity: { duration: 0.18, ease: EASE_SLIDE },
                        }}
                      />
                    )}
                  </AnimatePresence>
                </motion.span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
