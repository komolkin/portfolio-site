"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import PlaygroundNav from "@/components/playground/PlaygroundNav";
import {
  projectIdFromIndex1,
  playgroundIndexFromPathname,
} from "@/components/playground/playground-route";
import ResolvedCard from "@/components/playground/projects/resolved-card/ResolvedCard";
import LeverageSelector from "@/components/playground/projects/leverage-selector/LeverageSelector";
import BinaryMarket from "@/components/playground/projects/binary-market/BinaryMarket";
import Position from "@/components/playground/projects/position/Position";
import PnlChart from "@/components/playground/projects/pnl-chart/PnlChart";

export default function PlaygroundSlide() {
  const pathname = usePathname();
  const activeProject = useMemo(
    () => projectIdFromIndex1(playgroundIndexFromPathname(pathname ?? "/")),
    [pathname]
  );
  const activeProjectNode = useMemo(() => {
    if (activeProject === "resolved-card") return <ResolvedCard />;
    if (activeProject === "leverage-selector") return <LeverageSelector />;
    if (activeProject === "binary-market") return <BinaryMarket />;
    if (activeProject === "pnl-chart") return <PnlChart />;
    return <Position />;
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
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeProject}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
            >
              {activeProjectNode}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
