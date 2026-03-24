"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

const SLIDE_MS = 4000;

const EASE_SLIDE = [0.22, 1, 0.36, 1] as const;

const transitionContent = {
  duration: 0.38,
  ease: EASE_SLIDE,
} as const;

const transitionImage = {
  duration: 0.5,
  ease: EASE_SLIDE,
} as const;

const transitionDot = {
  duration: 0.32,
  ease: EASE_SLIDE,
} as const;

/** Inactive dot — matches `text-muted-foreground` at ~45% opacity */
const DOT_INACTIVE_BG = "hsla(0, 0%, 63.9%, 0.45)";
const DOT_TRACK_BG = "rgba(255, 255, 255, 0.2)";

const SLIDES: ReadonlyArray<{
  title: string;
  subtitle?: string;
  cta?: string;
  image: string;
  /** Card fill behind text + image */
  background: string;
}> = [
  {
    title: "Create markets to earn 2.5% on each trade",
    image:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=560&h=440&fit=crop&q=80",
    background: "#000000",
  },
  {
    title: "Trade with up to\n5x leverage",
    image:
      "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=560&h=440&fit=crop&q=80",
    background: "#000000",
  },
  {
    title: "Explore Sports markets",
    image:
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=560&h=440&fit=crop&q=80",
    background: "#000000",
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

  const slide = SLIDES[index];

  return (
    <section
      className="relative flex h-[220px] w-[630px] overflow-hidden rounded-2xl border border-white/[0.08] shadow-[0_8px_40px_rgba(0,0,0,0.45)]"
      style={{ backgroundColor: slide.background }}
      aria-roledescription="carousel"
      aria-label="Spotlight"
    >
      <div className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-row">
        <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col justify-center overflow-hidden px-7 pr-4">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={index}
              className="flex w-full flex-col gap-2"
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
                <div className="pt-1">
                  <button
                    type="button"
                    className="inline-flex h-9 items-center justify-center rounded-full border-0 bg-white px-4 text-sm font-medium text-black transition-colors hover:bg-white/90 active:scale-[0.98]"
                  >
                    {slide.cta}
                  </button>
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="relative h-full min-h-0 w-[268px] shrink-0 overflow-hidden">
          <AnimatePresence initial={false}>
            <motion.div
              key={index}
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 1.035 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={transitionImage}
            >
              <Image
                src={slide.image}
                alt={slide.title}
                fill
                sizes="268px"
                className="object-cover"
              />
            </motion.div>
          </AnimatePresence>
          <div
            className="pointer-events-none absolute inset-0 z-10"
            style={{
              backgroundImage: `linear-gradient(to right, ${slide.background}, transparent)`,
            }}
            aria-hidden
          />
        </div>
      </div>

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
                        className="absolute inset-y-0 left-0 block w-full origin-left rounded-full bg-foreground"
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
