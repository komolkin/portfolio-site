"use client";

import { useState } from "react";
import {
  getHapticsDebug,
  hapticError,
  hapticSuccess,
  hapticWarning,
  setHapticsDebug,
} from "@/lib/haptics";
import { PRESS_PRESET } from "@/lib/sfx";
import { useSfx } from "@/lib/useSfx";

const SOUNDS = [
  {
    id: "click",
    label: "playClick",
    detail: "Noise · bandpass 1400 Hz + 0–600 jitter · Q 5 · 0.2 → 0.001 / 6 ms",
    where: "Nav, menus, toggles, FAQ, pricing tabs, follow, icon buttons",
    play: (sfx: ReturnType<typeof useSfx>) => sfx.playClick(),
  },
  {
    id: "tick",
    label: "playTick",
    detail: "Noise · bandpass 5200 Hz + 0–600 jitter · Q 5 · 0.2 → 0.001 / 6 ms",
    where: "Hover on small controls; slide-dot / carousel steps",
    play: (sfx: ReturnType<typeof useSfx>) => sfx.playTick(),
  },
  {
    id: "press",
    label: "playPress",
    detail: `Preset masterGain ${PRESS_PRESET.masterGain} · bandpass 1700 Hz · Q 1.4 · peak 0.13 / 20 ms`,
    where: "Primary CTAs (Subscribe, Book, Buy/Sell, let’s talk)",
    play: (sfx: ReturnType<typeof useSfx>) => sfx.playPress(),
  },
] as const;

export default function SfxDevPage() {
  const sfx = useSfx();
  const [hapticDebug, setHapticDebug] = useState(getHapticsDebug);

  return (
    <main className="h-[100dvh] overflow-y-auto bg-background px-6 py-16 text-foreground md:px-10">
      <div className="mx-auto flex max-w-xl flex-col gap-10">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Dev · SFX
          </p>
          <h1 className="text-3xl font-normal tracking-tight">UI sounds</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Synthesized Web Audio presets. Click a row to audition. Sound is off when
            reduced-motion is preferred, or when the toggle below is disabled.
          </p>
        </header>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={sfx.soundEnabled}
            onClick={() => sfx.setSoundEnabled(!sfx.soundEnabled)}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-sm"
          >
            <span
              className={`size-1.5 rounded-full ${sfx.soundEnabled ? "bg-white" : "bg-white/30"}`}
              aria-hidden
            />
            Sound {sfx.soundEnabled ? "on" : "off"}
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={hapticDebug}
            onClick={() => {
              const next = !hapticDebug;
              setHapticsDebug(next);
              setHapticDebug(next);
            }}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-sm"
          >
            <span
              className={`size-1.5 rounded-full ${hapticDebug ? "bg-white" : "bg-white/30"}`}
              aria-hidden
            />
            Haptic debug {hapticDebug ? "on" : "off"}
          </button>
        </div>

        <section className="space-y-2" aria-label="Sound presets">
          {SOUNDS.map((sound) => (
            <button
              key={sound.id}
              type="button"
              onClick={() => sound.play(sfx)}
              className="w-full rounded-2xl bg-white/[0.06] px-4 py-4 text-left transition-colors hover:bg-white/[0.1]"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-mono text-sm">{sound.label}()</span>
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  Play
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-snug text-white/70">
                {sound.detail}
              </p>
              <p className="mt-1 text-xs text-white/70">{sound.where}</p>
            </button>
          ))}
        </section>

        <section className="space-y-2" aria-label="Haptic patterns">
          <h2 className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Haptics
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["success", hapticSuccess],
                ["warning", hapticWarning],
                ["error", hapticError],
              ] as const
            ).map(([name, play]) => (
              <button
                key={name}
                type="button"
                onClick={play}
                className="rounded-2xl bg-white/[0.06] py-3 text-sm capitalize transition-colors hover:bg-white/[0.1]"
              >
                {name}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Uses navigator.vibrate. With debug on, each pulse also fires playClick(intensity).
          </p>
        </section>
      </div>
    </main>
  );
}
