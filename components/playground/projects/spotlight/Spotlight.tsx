"use client";

import { useCallback, useEffect, useState } from "react";
import { GrainGradient } from "@paper-design/shaders-react";
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

/** Background layers overlap while exiting (1→0) and entering (0→1) — default AnimatePresence `sync` */
const transitionShaderCrossfade = {
  duration: 0.7,
  ease: EASE_SLIDE,
} as const;

/** Dots + progress line in pure white shades */
const DOT_INACTIVE_BG = "rgba(255, 255, 255, 0.35)";
const DOT_TRACK_BG = "rgba(255, 255, 255, 0.16)";

type GrainSlideParams = {
  colors: readonly string[];
  colorBack: string;
  softness: number;
  intensity: number;
  noise: number;
  shape: "ripple" | "dots" | "wave" | "corners" | "blob" | "truchet";
  speed: number;
  scale: number;
};

type SpotlightSlide = {
  title: string;
  subtitle?: string;
  cta?: string;
  background: string;
  grain: GrainSlideParams;
};

const SLIDES: ReadonlyArray<SpotlightSlide> = [
  {
    title: "Create markets to earn 2.5% on each trade",
    background: "#140a00",
    grain: {
      colors: ["#702d00", "#88ddae", "#2d0b1e"],
      colorBack: "#140a00",
      softness: 0.5,
      intensity: 0,
      noise: 0,
      shape: "ripple",
      speed: 1,
      scale: 0.5,
    },
  },
  {
    title: "Trade with up to\n5x leverage",
    background: "#0a0000",
    grain: {
      colors: ["#700000", "#0080ff", "#f2ebca", "#33cc33"],
      colorBack: "#0a0000",
      softness: 1,
      intensity: 0,
      noise: 0,
      shape: "dots",
      speed: 1,
      scale: 0.6,
    },
  },
  {
    title: "Explore trending\nSports markets",
    background: "#000000",
    grain: {
      colors: ["#7300ff", "#eba8ff", "#00bfff", "#2b00ff"],
      colorBack: "#000000",
      softness: 0.5,
      intensity: 0,
      noise: 0,
      shape: "corners",
      speed: 1,
      scale: 0.5,
    },
  },
];

export default function Spotlight() {
  const [index, setIndex] = useState(0);

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
        style={{ backgroundColor: slide.background }}
        aria-label={`Spotlight: ${slide.title}`}
      >
      {/* Render all shader layers once; cross-fade via opacity to avoid heavy remount work on click. */}
      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden rounded-2xl">
        {SLIDES.map((layer, i) => {
          const isActive = i === index;
          return (
            <motion.div
              key={i}
              className="absolute inset-0 overflow-hidden rounded-2xl"
              initial={false}
              animate={{ opacity: isActive ? 1 : 0 }}
              transition={transitionShaderCrossfade}
            >
              <GrainGradient
                width={630}
                height={220}
                colors={[...layer.grain.colors]}
                colorBack={layer.grain.colorBack}
                softness={layer.grain.softness}
                intensity={layer.grain.intensity}
                noise={layer.grain.noise}
                shape={layer.grain.shape}
                speed={layer.grain.speed}
                scale={layer.grain.scale}
                style={{ width: "100%", height: "100%", display: "block" }}
              />
            </motion.div>
          );
        })}
      </div>

      {/* Subtle dark overlay to improve text readability over shaders */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] rounded-2xl bg-black/40"
        aria-hidden
      />

      <div className="relative z-[2] flex h-full min-h-0 min-w-0 w-full flex-1 flex-col">
        <div className="relative flex h-full min-h-0 min-w-0 w-full flex-col justify-center overflow-hidden px-8 pr-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={index}
              className="flex w-full max-w-[315px] flex-col gap-2"
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
