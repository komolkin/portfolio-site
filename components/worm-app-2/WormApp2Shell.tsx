"use client";

import { useEffect } from "react";
import MainFeed from "./MainFeed";

function syncWormAppHeight() {
  const vv = window.visualViewport;
  const height = Math.max(
    window.innerHeight,
    document.documentElement.clientHeight,
    vv ? Math.ceil(vv.height + (vv.offsetTop || 0)) : 0,
  );
  document.documentElement.style.setProperty(
    "--worm-app-height",
    `${height}px`,
  );
}

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
    window.addEventListener("orientationchange", onResize);

    return () => {
      html.style.backgroundColor = prevHtmlBg;
      body.style.backgroundColor = prevBodyBg;
      html.classList.remove("worm-app-active");
      html.style.removeProperty("--worm-app-height");
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  return (
    <div className="relative h-full min-h-[var(--worm-app-height,100%)] w-full overflow-hidden bg-black text-white">
      <MainFeed />
    </div>
  );
}
