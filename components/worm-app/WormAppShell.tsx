"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";

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
    if (!("serviceWorker" in navigator)) return;
    const register = () => {
      void navigator.serviceWorker
        .register("/worm-app/sw.js", { scope: "/worm-app" })
        .catch(() => {
          /* installability still works on iOS without SW */
        });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return (
    <div className="fixed inset-0 h-[100dvh] w-full overflow-hidden bg-black text-white">
      <ApiApp app />
    </div>
  );
}
