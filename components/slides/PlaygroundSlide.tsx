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
      className="slide w-full h-[80dvh] md:h-screen flex flex-col relative"
    >
      <PlaygroundNav activeProject={activeProject} />
      <main className="flex-1 w-full min-w-0 pb-28 md:pb-0">
        <div className="w-full min-h-full md:h-full flex items-center justify-center px-4 pt-16 md:px-0 md:pt-0">
          {activeProject === "ball" && <Ball />}
          {activeProject === "resolved-card" && <ResolvedCard />}
          {activeProject === "leverage-selector" && <LeverageSelector />}
          {activeProject === "binary-compact" && <BinaryCompact />}
          {activeProject === "pnl-chart" && <PnlChart />}
          {activeProject === "position-1" && <Position1 />}
          {activeProject === "position-2" && <Position2 />}
          {activeProject === "mcp" && <Mcp />}
          {activeProject === "thinking" && <Thinking />}
          {activeProject === "ai-cam" && <AiCam />}
          {activeProject === "worm" && <Worm />}
        </div>
      </main>
    </div>
  );
}
