"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CardEffectSurface } from "@/components/playground/card-effects";

/**
 * AI "Worm in" button — Figma section (node 20309:30386):
 * https://www.figma.com/design/XSjBMcMS96jS8ntZIpMukQ/Ilya?node-id=20309-30386
 *
 * Logos cycle Claude → OpenAI → Grok every 3s with a slide-up.
 * Prism surface matches Live Preview / F1 card effects.
 */
const LOGOS = [
  { id: "claude", src: "/playground/ai/logo-claude.svg", label: "Claude" },
  { id: "openai", src: "/playground/ai/logo-openai.svg", label: "OpenAI" },
  { id: "grok", src: "/playground/ai/logo-grok.svg", label: "Grok" },
] as const;

const CYCLE_MS = 3_000;
const LOGO_SIZE = 24;

export default function Ai() {
  const prefersReducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const logo = LOGOS[index];

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % LOGOS.length);
    }, CYCLE_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex h-full w-full items-center justify-center px-4">
      <button
        type="button"
        data-sfx="click"
        className="group relative flex items-center justify-center gap-1 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] px-4 py-2 shadow-[inset_0px_0px_4px_0px_rgba(255,255,255,0.25)] transition-[background-color,border-color,transform,box-shadow] duration-150 ease-out hover:border-white/20 hover:bg-white/[0.09] hover:shadow-[inset_0px_0px_6px_0px_rgba(255,255,255,0.38)] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80"
        aria-label={`Worm in with ${logo.label}`}
      >
        <CardEffectSurface effect="prism" />

        <span className="relative z-[1] text-sm font-semibold leading-[1.25] whitespace-nowrap text-white">
          Worm in
        </span>

        <span
          className="relative z-[1] block shrink-0 overflow-hidden"
          style={{ width: LOGO_SIZE, height: LOGO_SIZE }}
          aria-hidden
        >
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={logo.id}
              className="absolute inset-0 block"
              initial={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { y: LOGO_SIZE, opacity: 0 }
              }
              animate={{ y: 0, opacity: 1 }}
              exit={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { y: -LOGO_SIZE, opacity: 0 }
              }
              transition={
                prefersReducedMotion
                  ? { duration: 0.2 }
                  : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logo.src}
                alt=""
                width={LOGO_SIZE}
                height={LOGO_SIZE}
                className="pointer-events-none size-full select-none"
                draggable={false}
              />
            </motion.span>
          </AnimatePresence>
        </span>
      </button>
    </div>
  );
}
