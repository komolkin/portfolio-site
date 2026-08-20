type Env = { attack: number; decay: number; peak: number; offset?: number };
export type Layer =
  | ({ kind: "noise"; filterType: BiquadFilterType; filterFrequency: number; filterQ: number } & Env)
  | ({ kind: "tone"; waveform: OscillatorType; frequency: number } & Env);
export type Preset = { masterGain: number; layers: Layer[] };

type AudioWindow = Window & {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
};

const STORAGE_KEY = "sfx-enabled";
const JITTER_HZ = 600;

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;
let booted = false;
let enabled = true;
let readStore = false;
const listeners = new Set<() => void>();

function win(): Window | undefined {
  return typeof window === "undefined" ? undefined : window;
}

function loadEnabled() {
  if (readStore) return;
  readStore = true;
  try {
    const v = win()?.localStorage.getItem(STORAGE_KEY);
    if (v !== null) enabled = v === "1";
  } catch {
    /* ignore */
  }
}

export function getSoundEnabled() {
  loadEnabled();
  return enabled;
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
  readStore = true;
  try {
    win()?.localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn());
}

export function subscribeSoundEnabled(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function canPlay() {
  if (!getSoundEnabled()) return false;
  if (win()?.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const ua = typeof navigator === "undefined" ? undefined : navigator.userActivation;
  return ua ? ua.hasBeenActive : true;
}

function getCtx() {
  const w = win() as AudioWindow | undefined;
  if (!w) return null;
  if (!ctx) {
    const AC = w.AudioContext || w.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

function unlock() {
  const c = getCtx();
  if (c?.state === "suspended") void c.resume();
}

export function initSfx() {
  if (booted) return;
  const w = win();
  if (!w) return;
  booted = true;
  loadEnabled();
  const boot = () => {
    getCtx();
  };
  if (typeof w.requestIdleCallback === "function") w.requestIdleCallback(boot, { timeout: 3000 });
  else w.setTimeout(boot, 1500);
  for (const ev of ["pointerdown", "touchstart", "keydown"] as const) {
    w.addEventListener(ev, unlock, { once: true, capture: true, passive: true });
  }
}

async function runningCtx() {
  const c = getCtx();
  if (!c) return null;
  try {
    if (c.state !== "running") await c.resume();
  } catch {
    return null;
  }
  return isRunning(c) ? c : null;
}

function isRunning(c: AudioContext) {
  return c.state === "running";
}

function noiseBuffer(c: AudioContext) {
  if (noise) return noise;
  const n = Math.max(1, Math.round(c.sampleRate * 0.005));
  const buf = c.createBuffer(1, n, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / 20);
  noise = buf;
  return buf;
}

function envelope(g: GainNode, t: number, attack: number, decay: number, peak: number) {
  const a = Math.max(0.001, attack);
  const d = Math.max(0.001, decay);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), t + a);
  g.gain.exponentialRampToValueAtTime(0.001, t + a + d);
}

export function playPreset(preset: Preset) {
  if (!canPlay()) return;
  void (async () => {
    try {
      const c = await runningCtx();
      if (!c) return;
      const master = c.createGain();
      master.gain.value = preset.masterGain;
      master.connect(c.destination);
      const t0 = c.currentTime;
      let end = t0;
      for (const layer of preset.layers) {
        const t = t0 + (layer.offset ?? 0);
        const g = c.createGain();
        envelope(g, t, layer.attack, layer.decay, layer.peak);
        const stopAt = t + layer.attack + layer.decay + 0.02;
        if (layer.kind === "noise") {
          const src = c.createBufferSource();
          src.buffer = noiseBuffer(c);
          const f = c.createBiquadFilter();
          f.type = layer.filterType;
          f.frequency.value = layer.filterFrequency;
          f.Q.value = layer.filterQ;
          src.connect(f);
          f.connect(g);
          g.connect(master);
          src.start(t);
          src.stop(stopAt);
        } else {
          const osc = c.createOscillator();
          osc.type = layer.waveform;
          osc.frequency.value = layer.frequency;
          osc.connect(g);
          g.connect(master);
          osc.start(t);
          osc.stop(stopAt);
        }
        end = Math.max(end, stopAt);
      }
      win()?.setTimeout(() => {
        try { master.disconnect(); } catch { /* ignore */ }
      }, (end - t0 + 0.05) * 1000);
    } catch {
      /* silent */
    }
  })();
}

function burst(hz: number, peak: number) {
  playPreset({
    masterGain: 1,
    layers: [{ kind: "noise", filterType: "bandpass", filterFrequency: hz + Math.random() * JITTER_HZ, filterQ: 5, attack: 0.001, decay: 0.006, peak }],
  });
}

export const playClick = (intensity = 1) => burst(1400, 0.2 * intensity);
export const playTick = (intensity = 1) => burst(5200, 0.2 * intensity);

/** Wiring knobs — frequencies, gains, and call sites are the lines that change per project. */
export const PRESS_PRESET: Preset = {
  masterGain: 0.4,
  layers: [{ kind: "noise", filterType: "bandpass", filterFrequency: 1700, filterQ: 1.4, attack: 0.001, decay: 0.02, peak: 0.13 }],
};
export const playPress = () => playPreset(PRESS_PRESET);

if (typeof window !== "undefined") initSfx();
