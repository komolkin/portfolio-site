"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import PlaygroundNav from "@/components/playground/PlaygroundNav";
import {
  projectIdFromIndex1,
  playgroundIndexFromPathname,
} from "@/components/playground/playground-route";
import ResolvedCard from "@/components/playground/projects/resolved-card/ResolvedCard";
import LeverageSelector from "@/components/playground/projects/leverage-selector/LeverageSelector";
import BinaryCompact from "@/components/playground/projects/binary-compact/BinaryCompact";
import Position1 from "@/components/playground/projects/position-1/Position1";
import Position2 from "@/components/playground/projects/position-2/Position2";
import Position3 from "@/components/playground/projects/position-3/Position3";
import Position4 from "@/components/playground/projects/position-4/Position4";
import PnlChart from "@/components/playground/projects/pnl-chart/PnlChart";
import Ball from "@/components/playground/projects/ball/Ball";
import Mcp from "@/components/playground/projects/mcp/Mcp";
import Thinking from "@/components/playground/projects/thinking/Thinking";
import AiCam from "@/components/playground/projects/ai-cam/AiCam";
import Worm from "@/components/playground/projects/worm/Worm";

export default function PlaygroundSlide() {
  const pathname = usePathname();
  const activeProject = useMemo(
    () => projectIdFromIndex1(playgroundIndexFromPathname(pathname ?? "/")),
    [pathname]
  );

  return (
    <div
      id="playground"
      data-section="playground"
      className="slide relative flex h-[100dvh] w-full flex-col md:h-screen"
    >
      <PlaygroundNav activeProject={activeProject} />
      <main className="relative z-0 flex min-h-0 w-full min-w-0 flex-1 items-center justify-center overflow-hidden py-28 md:py-0">
        <div
          className={`flex h-full w-full items-center justify-center px-4 md:px-0 md:[zoom:1] ${
            activeProject === "ball" ||
            activeProject === "mcp" ||
            activeProject === "thinking"
              ? "[zoom:1]"
              : "[zoom:0.7]"
          }`}
        >
          {activeProject === "ball" && <Ball />}
          {activeProject === "resolved-card" && <ResolvedCard />}
          {activeProject === "leverage-selector" && <LeverageSelector />}
          {activeProject === "binary-compact" && <BinaryCompact />}
          {activeProject === "pnl-chart" && <PnlChart />}
          {activeProject === "position-1" && <Position1 />}
          {activeProject === "position-2" && <Position2 />}
          {activeProject === "position-3" && <Position3 />}
          {activeProject === "position-4" && <Position4 />}
          {activeProject === "mcp" && <Mcp />}
          {activeProject === "thinking" && <Thinking />}
          {activeProject === "ai-cam" && <AiCam />}
          {activeProject === "worm" && <Worm />}
        </div>
      </main>
    </div>
  );
}
