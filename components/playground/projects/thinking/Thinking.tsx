"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { TextShimmer } from "@/components/playground/projects/thinking/TextShimmer";

const ThinkingCanvas3D = dynamic(
  () => import("@/components/playground/projects/thinking/ThinkingCanvas3D"),
  { ssr: false },
);

const THINKING_PHRASES = [
  "Looking for markets...",
  "Calculating risks...",
  "Setting positions...",
] as const;

const PHRASE_INTERVAL_MS = 2000;

export default function Thinking() {
  const areaRef = useRef<HTMLDivElement>(null);
  const [areaSize, setAreaSize] = useState({ width: 0, height: 0 });
  const [phraseIndex, setPhraseIndex] = useState(0);

  const measure = useCallback(() => {
    const el = areaRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setAreaSize({ width, height });
  }, []);

  useEffect(() => {
    measure();
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setPhraseIndex((i) => (i + 1) % THINKING_PHRASES.length);
    }, PHRASE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex h-full w-full items-center justify-center px-4 sm:px-6">
      <div className="flex w-fit max-w-full items-center gap-2.5 sm:gap-3 md:gap-4">
        <div
          ref={areaRef}
          className="relative size-14 shrink-0 select-none sm:size-20 md:size-24"
          aria-hidden
        >
          <ThinkingCanvas3D width={areaSize.width} height={areaSize.height} />
        </div>
        <div
          className="min-w-0 text-left text-lg font-normal leading-none tracking-tight sm:text-3xl md:text-4xl"
          aria-live="polite"
        >
          <div className="grid">
            {THINKING_PHRASES.map((phrase, i) =>
              i === phraseIndex ? (
                <TextShimmer
                  key={phrase}
                  as="span"
                  className="col-start-1 row-start-1 whitespace-nowrap"
                  duration={2}
                >
                  {phrase}
                </TextShimmer>
              ) : (
                <span
                  key={phrase}
                  className="col-start-1 row-start-1 whitespace-nowrap"
                  style={{ visibility: "hidden" }}
                  aria-hidden
                >
                  {phrase}
                </span>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
