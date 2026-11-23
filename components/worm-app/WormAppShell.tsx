"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { syncWormAppHeight } from "@/lib/wormAppHeight";

const ApiApp = dynamic(
  () => import("@/components/playground/projects/api/Api"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-black text-white/40">
        <span className="text-[15px] font-medium tracking-[-0.02em]">Worm</span>
      </div>
    ),
  },
);

export default function WormAppShell() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlBg = html.style.backgroundColor;
    const prevBodyBg = body.style.backgroundColor;
    // Homescreen / standalone: fill the home-indicator strip (html is otherwise #141414).
    html.style.backgroundColor = "#000000";
    body.style.backgroundColor = "#000000";
    html.classList.add("worm-app-active");
    syncWormAppHeight();

    const onResize = () => syncWormAppHeight();
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("scroll", onResize);
    window.addEventListener("orientationchange", onResize);

    if ("serviceWorker" in navigator) {
      const register = () => {
        void navigator.serviceWorker
          .register("/worm-app/sw.js", { scope: "/worm-app" })
          .catch(() => {
            /* installability still works on iOS without SW */
          });
      };
      if (document.readyState === "complete") register();
      else window.addEventListener("load", register, { once: true });
    }

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
      <ApiApp app />
    </div>
  );
}
