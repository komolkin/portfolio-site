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
import Spotlight from "@/components/playground/projects/spotlight/Spotlight";

export default function PlaygroundSlide() {
  const pathname = usePathname();
  const activeProject = useMemo(
    () => projectIdFromIndex1(playgroundIndexFromPathname(pathname)),
    [pathname]
  );

  return (
    <div
      id="playground"
      data-section="playground"
      className="slide w-full h-screen min-h-[100vh] flex relative"
    >
      <PlaygroundNav activeProject={activeProject} />
      <main className="flex-1 w-full min-w-0">
        <div className="w-full h-full flex items-center justify-center">
          {activeProject === "resolved-card" && <ResolvedCard />}
          {activeProject === "leverage-selector" && <LeverageSelector />}
          {activeProject === "spotlight" && <Spotlight />}
        </div>
      </main>
    </div>
  );
}
