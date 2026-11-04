"use client";

import Slides from "@/components/slides/Slides";
import HeaderNav from "@/components/HeaderNav";
import BgModeToggle from "@/components/BgModeToggle";
import { useTheme } from "@/lib/themeContext";

export default function HomePage() {
  const { chromeHidden } = useTheme();

  return (
    <div className="h-[100dvh] overflow-hidden">
      <Slides />
      {/* Fixed header in top left */}
      {!chromeHidden ? (
        <div className="fixed top-6 left-6 z-50 pointer-events-auto md:top-8 md:left-8 lg:top-10 lg:left-10">
          <HeaderNav />
        </div>
      ) : null}
      {/* Background / chrome mode in top right — always available to exit focus. */}
      <div className="fixed top-6 right-6 z-50 pointer-events-auto md:top-8 md:right-8 lg:top-10 lg:right-10">
        <BgModeToggle />
      </div>
    </div>
  );
}
