"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import {
  getSoundEnabled,
  playClick,
  playPreset,
  playPress,
  playTick,
  setSoundEnabled,
  subscribeSoundEnabled,
  type Preset,
} from "@/lib/sfx";

export type SfxName = "click" | "tick" | "press";

const PLAY: Record<SfxName, () => void> = {
  click: playClick,
  tick: playTick,
  press: playPress,
};

function isSfxName(v: string | null): v is SfxName {
  return v === "click" || v === "tick" || v === "press";
}

function blocked(el: Element) {
  return (
    ("disabled" in el && Boolean((el as HTMLButtonElement).disabled)) ||
    el.getAttribute("aria-disabled") === "true"
  );
}

function playNamed(name: string | null) {
  if (isSfxName(name)) PLAY[name]();
}

export function useSfx() {
  const soundEnabled = useSyncExternalStore(
    subscribeSoundEnabled,
    getSoundEnabled,
    () => true,
  );
  return {
    playClick,
    playTick,
    playPress,
    playPreset: (preset: Preset) => playPreset(preset),
    soundEnabled,
    setSoundEnabled,
  };
}

/** Capture-phase data-sfx / data-sfx-hover bindings. */
export function SfxRoot({ children }: { children: ReactNode }) {
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.("[data-sfx]");
      if (!el || blocked(el)) return;
      playNamed(el.getAttribute("data-sfx"));
    };
    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const el = (e.target as Element | null)?.closest?.("[data-sfx-hover]");
      if (!el || blocked(el)) return;
      const from = e.relatedTarget as Node | null;
      if (from && el.contains(from)) return;
      playNamed(el.getAttribute("data-sfx-hover"));
    };
    document.addEventListener("pointerdown", onDown, { capture: true, passive: true });
    document.addEventListener("pointerover", onOver, { capture: true, passive: true });
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("pointerover", onOver, true);
    };
  }, []);
  return children;
}
