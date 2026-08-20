import { playClick } from "@/lib/sfx";

export type HapticPulse = { duration: number; intensity: number; delay?: number };
export type HapticName = "success" | "warning" | "error";

export const HAPTIC_PATTERNS: Record<HapticName, HapticPulse[]> = {
  success: [
    { duration: 12, intensity: 0.35 },
    { duration: 18, intensity: 0.7, delay: 40 },
  ],
  warning: [
    { duration: 20, intensity: 0.45 },
    { duration: 20, intensity: 0.45, delay: 80 },
  ],
  error: [
    { duration: 40, intensity: 0.85 },
    { duration: 28, intensity: 0.55, delay: 60 },
  ],
};

let debug = false;

export function setHapticsDebug(on: boolean) {
  debug = on;
}

export function getHapticsDebug() {
  return debug;
}

function vibrate(pulses: HapticPulse[]) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  const seq: number[] = [];
  pulses.forEach((p, i) => {
    if (i === 0) seq.push(p.duration);
    else seq.push(p.delay ?? 0, p.duration);
  });
  try {
    navigator.vibrate(seq);
  } catch {
    /* ignore */
  }
}

function playPattern(pulses: HapticPulse[]) {
  vibrate(pulses);
  if (!debug || typeof window === "undefined") return;
  let t = 0;
  for (const p of pulses) {
    t += p.delay ?? 0;
    const intensity = p.intensity;
    window.setTimeout(() => playClick(intensity), t);
    t += p.duration;
  }
}

export function hapticSuccess() {
  playPattern(HAPTIC_PATTERNS.success);
}

export function hapticWarning() {
  playPattern(HAPTIC_PATTERNS.warning);
}

export function hapticError() {
  playPattern(HAPTIC_PATTERNS.error);
}
