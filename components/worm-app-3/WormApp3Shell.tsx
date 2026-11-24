"use client";

import { useEffect, useState } from "react";
import { unlockHaptics } from "@/lib/haptics";
import { syncWormAppHeight } from "@/lib/wormAppHeight";
import GetStarted from "./GetStarted";
import HapticsProvider from "./HapticsProvider";
import MainFeed from "./MainFeed";

const BG = "#E8E8E8";
const STAGE = "#121214";

export default function WormApp3Shell() {
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlBg = html.style.backgroundColor;
    const prevBodyBg = body.style.backgroundColor;
    html.style.backgroundColor = STAGE;
    body.style.backgroundColor = STAGE;
    html.classList.add("worm-app-active");
    syncWormAppHeight();

    const onResize = () => syncWormAppHeight();
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("scroll", onResize);
    window.addEventListener("orientationchange", onResize);

    return () => {
      html.style.backgroundColor = prevHtmlBg;
      body.style.backgroundColor = prevBodyBg;
      html.classList.remove("worm-app-active");
      html.style.removeProperty("--worm-app-height");
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("scroll", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  return (
    <HapticsProvider>
      <div
        className="relative h-full min-h-[var(--worm-app-height,100%)] w-full overflow-x-clip overflow-y-hidden overscroll-none text-black"
        style={{ backgroundColor: BG }}
        onPointerDown={unlockHaptics}
      >
        {started ? (
          <MainFeed />
        ) : (
          <GetStarted onComplete={() => setStarted(true)} />
        )}
      </div>
    </HapticsProvider>
  );
}
