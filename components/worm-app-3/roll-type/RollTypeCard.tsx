// Roll type (https://design.how/vault/roll-type), card.tsx.
// FIXED. Change the VARIABLE values in params instead (DEFAULT_PHRASES, STAGGER_MS, PHRASE_MS, GLASS_SPEED, LENS, FRINGE, FONT_WEIGHT, FONT_VAR).
"use client";
import "./fonts.css";
import { useEffect, useRef } from "react";
import { allo } from "@/lib/fonts";
import { prefersReducedMotion, usePause } from "./runtime/use-pause";
import { RollType } from "./engine";
import { DEFAULT_PHRASES, FONT_VAR, FONT_WEIGHT, type Phrases } from "./params";

export type RollTypeProps = {
  phrases?: Phrases;
  weight?: number;
  speed?: number;
  fontVar?: string;
  className?: string;
};

export default function RollTypeCard({
  phrases = DEFAULT_PHRASES,
  weight = FONT_WEIGHT,
  speed = 1,
  fontVar = FONT_VAR,
  className,
}: RollTypeProps) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<RollType | null>(null);
  const running = usePause(box, (run) =>
    run ? engine.current?.start() : engine.current?.stop(),
  );

  useEffect(() => {
    const element = canvas.current;
    const host = box.current;
    if (!element || !host) return;
    let cancelled = false;
    // Prefer next/font Allo; fall back to CSS var resolved inside the Allo-scoped host.
    const probe = document.createElement("span");
    probe.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;font-family:var(${fontVar});font-variation-settings:"ROND" 50`;
    probe.textContent = "Ag";
    host.appendChild(probe);
    const probed = getComputedStyle(probe).fontFamily;
    probe.remove();
    const family = allo.style.fontFamily || probed || "Allo, sans-serif";

    const build = () => {
      if (cancelled) return;
      const next = new RollType(element, { family, phrases, weight, speed });
      engine.current = next;
      if (!next.ok) return;
      if (prefersReducedMotion()) next.renderStill();
      else if (running.current) next.start();
    };
    const first = family.split(",")[0].replace(/["']/g, "").trim();
    const loadFace = document.fonts?.load
      ? document.fonts.load(`${weight} 1em "${first}"`)
      : Promise.resolve();
    const ready = document.fonts?.ready ?? Promise.resolve();
    void Promise.all([loadFace, ready]).then(build, build);

    let timer = 0;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => engine.current?.resize(), 120);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      window.clearTimeout(timer);
      engine.current?.destroy();
      engine.current = null;
    };
  }, [phrases, weight, speed, fontVar, running]);

  return (
    <div
      ref={box}
      role="img"
      aria-label={`Three phrases taking turns, each word rolling up out of sight as the next phrase rolls in under it: ${phrases.map((p) => p.lines.map((line) => line.join(" ")).join(" ")).join("; ")}.`}
      className={className}
      style={{ width: "100%", height: "100%", backgroundColor: phrases[0]?.ground }}
    >
      <canvas ref={canvas} style={{ display: "block", width: "100%", height: "100%" }} />
    </div>
  );
}
