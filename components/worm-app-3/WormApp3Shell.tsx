"use client";

import { useEffect } from "react";
import { syncWormAppHeight } from "@/lib/wormAppHeight";
import MainFeed from "./MainFeed";

const BG = "#E8E8E8";

export default function WormApp3Shell() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlBg = html.style.backgroundColor;
    const prevBodyBg = body.style.backgroundColor;
    html.style.backgroundColor = BG;
    body.style.backgroundColor = BG;
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
    <div
      className="relative h-full min-h-[var(--worm-app-height,100%)] w-full overflow-hidden text-black"
      style={{ backgroundColor: BG }}
    >
      <MainFeed />
    </div>
  );
}
