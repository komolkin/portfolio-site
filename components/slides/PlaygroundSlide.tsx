"use client";

import { useLayoutEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import PlaygroundNav from "@/components/playground/PlaygroundNav";
import {
  projectIdFromIndex1,
  playgroundIndexFromPathname,
  isPlaygroundDeepLink,
} from "@/components/playground/playground-route";
import ResolvedCard from "@/components/playground/projects/resolved-card/ResolvedCard";
import LeverageSelector from "@/components/playground/projects/leverage-selector/LeverageSelector";
import BinaryCompact from "@/components/playground/projects/binary-compact/BinaryCompact";
import Position1 from "@/components/playground/projects/position-1/Position1";
import Position7 from "@/components/playground/projects/position-7/Position7";
import PnlChart from "@/components/playground/projects/pnl-chart/PnlChart";
import Ball from "@/components/playground/projects/ball/Ball";
import Mcp from "@/components/playground/projects/mcp/Mcp";
import Thinking from "@/components/playground/projects/thinking/Thinking";
import AiCam from "@/components/playground/projects/ai-cam/AiCam";
import Worm from "@/components/playground/projects/worm/Worm";

export default function PlaygroundSlide() {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const activeProject = useMemo(
    () => projectIdFromIndex1(playgroundIndexFromPathname(pathname ?? "/")),
    [pathname]
  );

  // `/5` etc. should land on the playground slide, not About
  useLayoutEffect(() => {
    if (!pathname || !isPlaygroundDeepLink(pathname)) return;

    const playground = document.getElementById("playground");
    if (!playground) return;

    playground.scrollIntoView({ behavior: "auto", block: "start" });
  }, [pathname]);

  const zoomClass =
    activeProject === "ball" ||
    activeProject === "mcp" ||
    activeProject === "thinking" ||
    activeProject === "resolved-card"
      ? "h-full [zoom:1]"
      : activeProject.startsWith("position-")
        ? "[zoom:0.6]"
        : "[zoom:0.7]";

  return (
    <div
      id="playground"
      data-section="playground"
      className="slide relative flex h-[100dvh] w-full flex-col md:h-screen"
    >
      <PlaygroundNav activeProject={activeProject} />
      <main className="relative z-0 flex min-h-0 w-full min-w-0 flex-1 items-center justify-center overflow-hidden py-28 md:py-0">
        <AnimatePresence mode="wait" initial>
          <motion.div
            key={activeProject}
            initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
            animate={{
              opacity: 1,
              transition: prefersReducedMotion
                ? { duration: 0 }
                : { duration: 0.32, delay: 0.5, ease: [0.22, 1, 0.36, 1] },
            }}
            exit={{
              opacity: prefersReducedMotion ? 1 : 0,
              transition: prefersReducedMotion
                ? { duration: 0 }
                : { duration: 0.2, ease: "easeIn" },
            }}
            className={`flex w-full items-center justify-center px-4 md:h-full md:px-0 md:[zoom:1] ${zoomClass}`}
          >
            {activeProject === "ball" && <Ball />}
            {activeProject === "resolved-card" && <ResolvedCard />}
            {activeProject === "leverage-selector" && <LeverageSelector />}
            {activeProject === "binary-compact" && <BinaryCompact />}
            {activeProject === "pnl-chart" && <PnlChart />}
            {activeProject === "position-1" && <Position1 />}
            {activeProject === "position-7" && <Position7 />}
            {activeProject === "mcp" && <Mcp />}
            {activeProject === "thinking" && <Thinking />}
            {activeProject === "ai-cam" && <AiCam />}
            {activeProject === "worm" && <Worm />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
