import type { FoodKind } from "@/components/playground/projects/worm/worm-game";

type AudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext || (window as AudioWindow).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedCtx) sharedCtx = new Ctor();
  return sharedCtx;
}

/** Prime / unlock audio on first gesture (autoplay policy). */
export async function resumeWormAudio(): Promise<void> {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") await ctx.resume();
  } catch {
    // Autoplay / policy — fail silently.
  }
}

function tone(
  ctx: AudioContext,
  {
    freq,
    start,
    duration,
    type = "sine",
    gain = 0.2,
    slideTo,
  }: {
    freq: number;
    start: number;
    duration: number;
    type?: OscillatorType;
    gain?: number;
    slideTo?: number;
  },
) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo != null) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(20, slideTo),
      start + duration,
    );
  }
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function noiseBurst(
  ctx: AudioContext,
  start: number,
  duration: number,
  gain = 0.08,
) {
  const sampleRate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    const env = 1 - i / length;
    data[i] = (Math.random() * 2 - 1) * env * env;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1800;
  filter.Q.value = 0.8;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  src.connect(filter);
  filter.connect(g);
  g.connect(ctx.destination);
  src.start(start);
  src.stop(start + duration + 0.02);
}

export function playWormEat(kind: FoodKind): void {
  const ctx = getCtx();
  if (!ctx) return;
  void ctx.resume().catch(() => {});
  const now = ctx.currentTime;

  try {
    if (kind === "small") {
      // Soft pickup — random You're-in prop.
      noiseBurst(ctx, now, 0.05, 0.07);
      tone(ctx, {
        freq: 660,
        start: now,
        duration: 0.1,
        type: "triangle",
        gain: 0.14,
        slideTo: 880,
      });
      tone(ctx, {
        freq: 990,
        start: now + 0.05,
        duration: 0.12,
        type: "sine",
        gain: 0.1,
      });
      return;
    }

    if (kind === "big") {
      // Juicier pickup.
      noiseBurst(ctx, now, 0.06, 0.09);
      tone(ctx, {
        freq: 523,
        start: now,
        duration: 0.12,
        type: "triangle",
        gain: 0.16,
        slideTo: 784,
      });
      tone(ctx, {
        freq: 784,
        start: now + 0.06,
        duration: 0.14,
        type: "sine",
        gain: 0.12,
      });
      tone(ctx, {
        freq: 1046,
        start: now + 0.12,
        duration: 0.16,
        type: "sine",
        gain: 0.09,
      });
      return;
    }

    // Logo W — sparkling fanfare.
    noiseBurst(ctx, now, 0.04, 0.05);
    const notes = [
      { freq: 784, start: 0.0, duration: 0.16 },
      { freq: 988, start: 0.07, duration: 0.16 },
      { freq: 1175, start: 0.14, duration: 0.18 },
      { freq: 1568, start: 0.22, duration: 0.28 },
    ] as const;
    notes.forEach((n) => {
      tone(ctx, {
        freq: n.freq,
        start: now + n.start,
        duration: n.duration,
        type: "sine",
        gain: 0.13,
      });
      tone(ctx, {
        freq: n.freq * 2,
        start: now + n.start,
        duration: n.duration * 0.7,
        type: "triangle",
        gain: 0.04,
      });
    });
  } catch {
    // Fail silently.
  }
}

export function playWormDie(): void {
  const ctx = getCtx();
  if (!ctx) return;
  void ctx.resume().catch(() => {});
  const now = ctx.currentTime;
  try {
    noiseBurst(ctx, now, 0.08, 0.1);
    tone(ctx, {
      freq: 220,
      start: now,
      duration: 0.28,
      type: "sawtooth",
      gain: 0.08,
      slideTo: 70,
    });
    tone(ctx, {
      freq: 110,
      start: now + 0.05,
      duration: 0.35,
      type: "square",
      gain: 0.05,
      slideTo: 40,
    });
  } catch {
    // Fail silently.
  }
}

export function playWormWin(): void {
  const ctx = getCtx();
  if (!ctx) return;
  void ctx.resume().catch(() => {});
  const now = ctx.currentTime;
  try {
    const notes = [
      { freq: 523, start: 0.0 },
      { freq: 659, start: 0.09 },
      { freq: 784, start: 0.18 },
      { freq: 1046, start: 0.3 },
      { freq: 1318, start: 0.42 },
    ] as const;
    notes.forEach((n, i) => {
      tone(ctx, {
        freq: n.freq,
        start: now + n.start,
        duration: 0.22 + i * 0.03,
        type: "sine",
        gain: 0.14,
      });
      tone(ctx, {
        freq: n.freq * 2,
        start: now + n.start,
        duration: 0.18,
        type: "triangle",
        gain: 0.045,
      });
    });
  } catch {
    // Fail silently.
  }
}

export function playWormStart(): void {
  const ctx = getCtx();
  if (!ctx) return;
  void ctx.resume().catch(() => {});
  const now = ctx.currentTime;
  try {
    tone(ctx, {
      freq: 392,
      start: now,
      duration: 0.12,
      type: "triangle",
      gain: 0.1,
      slideTo: 523,
    });
    tone(ctx, {
      freq: 523,
      start: now + 0.08,
      duration: 0.14,
      type: "sine",
      gain: 0.08,
    });
  } catch {
    // Fail silently.
  }
}
