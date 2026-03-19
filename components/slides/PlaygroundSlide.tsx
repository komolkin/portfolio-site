"use client";

import { useState } from "react";
import PlaygroundNav, { PROJECTS, type ProjectId } from "@/components/playground/PlaygroundNav";
import ResolvedCard from "@/components/playground/projects/resolved-card/ResolvedCard";
import LeverageSelector from "@/components/playground/projects/leverage-selector/LeverageSelector";

export default function PlaygroundSlide() {
  const [activeProject, setActiveProject] = useState<ProjectId>(PROJECTS[0].id);

  return (
    <div
      id="playground"
      data-section="playground"
      className="slide w-full h-screen min-h-[100vh] flex relative"
    >
      <PlaygroundNav activeProject={activeProject} onSelect={setActiveProject} />
      <main className="flex-1 w-full min-w-0">
        <div className="w-full h-full flex items-center justify-center">
          {activeProject === "resolved-card" && <ResolvedCard />}
          {activeProject === "leverage-selector" && <LeverageSelector />}
        </div>
      </main>
    </div>
  );
}
