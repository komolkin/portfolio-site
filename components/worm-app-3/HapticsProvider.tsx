"use client";

import { useEffect } from "react";
import { useWebHaptics } from "web-haptics/react";
import { bindHapticsTrigger, unlockHaptics } from "@/lib/haptics";

/**
 * Same entry as https://haptics.lochie.me — `useWebHaptics` owns the instance.
 * `debug: true` keeps the library's input[switch] + audio technique active even
 * when Vibration API is present but inert (e.g. http LAN previews).
 */
export default function HapticsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { trigger } = useWebHaptics({ debug: true, showSwitch: false });

  useEffect(() => {
    bindHapticsTrigger((input, options) =>
      Promise.resolve(trigger(input, options)).then(() => undefined),
    );
    return () => bindHapticsTrigger(null);
  }, [trigger]);

  useEffect(() => {
    const prime = () => unlockHaptics();
    window.addEventListener("pointerdown", prime, { once: true, capture: true });
    window.addEventListener("touchstart", prime, { once: true, capture: true });
    return () => {
      window.removeEventListener("pointerdown", prime, true);
      window.removeEventListener("touchstart", prime, true);
    };
  }, []);

  return children;
}
