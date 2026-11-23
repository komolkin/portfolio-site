"use client";

import { useEffect } from "react";
import { syncWormAppHeight } from "@/lib/wormAppHeight";
import MainFeed from "./MainFeed";

export default function WormApp2Shell() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlBg = html.style.backgroundColor;
    const prevBodyBg = body.style.backgroundColor;
    html.style.backgroundColor = "#000000";
    body.style.backgroundColor = "#000000";
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
    <div className="relative h-full min-h-[var(--worm-app-height,100%)] w-full overflow-hidden bg-black text-white">
      <MainFeed />
    </div>
  );
}
