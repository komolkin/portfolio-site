"use client";

import { useEffect } from "react";
import { useWebHaptics } from "web-haptics/react";
import { bindHapticsTrigger } from "@/lib/haptics";

/**
 * Same setup as https://haptics.lochie.me — React hook owns the WebHaptics
 * instance. On iOS (no Vibration API) enable the library's audio fallback.
 */
export default function HapticsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const noVibrate =
    typeof navigator !== "undefined" &&
    typeof navigator.vibrate !== "function";
  const { trigger } = useWebHaptics({ debug: noVibrate });

  useEffect(() => {
    bindHapticsTrigger((input, options) =>
      Promise.resolve(trigger(input, options)).then(() => undefined),
    );
    return () => bindHapticsTrigger(null);
  }, [trigger]);

  return children;
}
