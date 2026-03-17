"use client";

import { useState } from "react";
import PlaygroundNav, { type ProjectId } from "@/components/playground/PlaygroundNav";
import ResolvedCard from "@/components/playground/projects/resolved-card/ResolvedCard";
import UserpicStudio from "@/components/playground/projects/userpic-studio/UserpicStudio";

export default function PlaygroundSlide() {
  const [activeProject, setActiveProject] = useState<ProjectId>("resolved-card");

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
          {activeProject === "userpic-studio" && <UserpicStudio />}
        </div>
      </main>
    </div>
  );
}
