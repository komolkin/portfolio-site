"use client";

import { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import PlaygroundNav from "@/components/playground/PlaygroundNav";
import {
  projectIdFromIndex1,
  playgroundIndexFromPathname,
} from "@/components/playground/playground-route";
import ResolvedCard from "@/components/playground/projects/resolved-card/ResolvedCard";
import LeverageSelector from "@/components/playground/projects/leverage-selector/LeverageSelector";
import BinaryMarket from "@/components/playground/projects/binary-market/BinaryMarket";
import BinaryCompact from "@/components/playground/projects/binary-compact/BinaryCompact";
import Position2 from "@/components/playground/projects/position-2/Position2";
import Position3 from "@/components/playground/projects/position-3/Position3";
import PnlChart from "@/components/playground/projects/pnl-chart/PnlChart";
import Ball from "@/components/playground/projects/ball/Ball";
import BallWC from "@/components/playground/projects/ball-wc/BallWC";
import Mcp from "@/components/playground/projects/mcp/Mcp";
import Thinking from "@/components/playground/projects/thinking/Thinking";
import AiCam from "@/components/playground/projects/ai-cam/AiCam";

export default function PlaygroundSlide() {
  const pathname = usePathname();
  const activeProject = useMemo(
    () => projectIdFromIndex1(playgroundIndexFromPathname(pathname ?? "/")),
    [pathname]
  );

  useEffect(() => {
    if (activeProject === "ball-wc") {
      document.body.dataset.playgroundProject = "ball-wc";
      return;
    }
    delete document.body.dataset.playgroundProject;
  }, [activeProject]);

  return (
    <div
      id="playground"
      data-section="playground"
      className="slide w-full h-screen min-h-[100vh] flex relative"
    >
      <PlaygroundNav activeProject={activeProject} />
      <main className="flex-1 w-full min-w-0">
        <div className="w-full h-full flex items-center justify-center">
          {activeProject === "ball" && <Ball />}
          {activeProject === "ball-wc" && <BallWC />}
          {activeProject === "resolved-card" && <ResolvedCard />}
          {activeProject === "leverage-selector" && <LeverageSelector />}
          {activeProject === "binary-market" && <BinaryMarket />}
          {activeProject === "binary-compact" && <BinaryCompact />}
          {activeProject === "pnl-chart" && <PnlChart />}
          {activeProject === "position-2" && <Position2 />}
          {activeProject === "position-3" && <Position3 />}
          {activeProject === "mcp" && <Mcp />}
          {activeProject === "thinking" && <Thinking />}
          {activeProject === "ai-cam" && <AiCam />}
        </div>
      </main>
    </div>
  );
}
