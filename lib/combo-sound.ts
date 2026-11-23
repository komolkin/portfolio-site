import { getSoundEnabled } from "@/lib/sfx";

let audio: AudioContext | null = null;

const STEPS = [
  { freq: 440, gain: 0.07, decay: 0.32 },
  { freq: 493.88, gain: 0.066, decay: 0.3 },
  { freq: 554.37, gain: 0.062, decay: 0.28 },
  { freq: 659.25, gain: 0.056, decay: 0.26 },
  { freq: 739.99, gain: 0.05, decay: 0.24 },
  { freq: 880, gain: 0.045, decay: 0.22 },
  { freq: 987.77, gain: 0.04, decay: 0.2 },
  { freq: 1108.73, gain: 0.036, decay: 0.18 },
] as const;

function canPlay() {
  if (!getSoundEnabled()) return false;
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  return true;
}

function context() {
  if (typeof window === "undefined") return null;
  if (!audio) audio = new AudioContext();
  if (audio.state === "suspended") void audio.resume();
  return audio;
}

if (typeof window !== "undefined") {
  const unlock = () => {
    const ctx = context();
    if (ctx && ctx.state === "suspended") void ctx.resume();
  };
  window.addEventListener("pointerdown", unlock);
}

function stepFor(count: number) {
  const index = Math.min(STEPS.length, Math.max(1, count)) - 1;
  return STEPS[index];
}

function playVoice(
  frequency: number,
  peak: number,
  decay: number,
  delay = 0,
  glide = 1,
) {
  if (!canPlay()) return;
  const ctx = context();
  if (!ctx) return;
  const start = ctx.currentTime + delay;
  const settle = start + Math.min(0.08, decay * 0.4);
  const target = Math.max(40, frequency * glide);

  const voice = ctx.createBiquadFilter();
  const amp = ctx.createGain();
  voice.type = "lowpass";
  voice.frequency.setValueAtTime(Math.min(4200, frequency * 3.2), start);
  voice.frequency.exponentialRampToValueAtTime(
    Math.max(700, target * 1.15),
    start + decay,
  );
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.linearRampToValueAtTime(peak, start + 0.014);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + decay);
  voice.connect(amp);
  amp.connect(ctx.destination);

  const body = ctx.createOscillator();
  body.type = "sine";
  body.frequency.setValueAtTime(frequency * 1.035, start);
  body.frequency.exponentialRampToValueAtTime(target, settle);
  body.connect(voice);

  const wood = ctx.createOscillator();
  const woodGain = ctx.createGain();
  wood.type = "triangle";
  wood.frequency.value = target * 2.41;
  woodGain.gain.setValueAtTime(0.26, start);
  woodGain.gain.exponentialRampToValueAtTime(0.0001, start + decay * 0.55);
  wood.connect(woodGain);
  woodGain.connect(voice);

  const tap = ctx.createOscillator();
  const tapGain = ctx.createGain();
  tap.type = "sine";
  tap.frequency.value = target * 4.8;
  tapGain.gain.setValueAtTime(0.05, start);
  tapGain.gain.exponentialRampToValueAtTime(0.0001, start + Math.min(0.05, decay));
  tap.connect(tapGain);
  tapGain.connect(voice);

  const stop = start + decay + 0.04;
  for (const oscillator of [body, wood, tap]) {
    oscillator.start(start);
    oscillator.stop(stop);
  }
}

/** Rising wood/sine note for the Nth pick (1–8). */
export function playComboAdd(count = 1, delay = 0) {
  const step = stepFor(count);
  playVoice(step.freq, step.gain, step.decay, delay);
}

/** Soft down-glide when removing; count is remaining picks (0 = cleared). */
export function playComboRemove(count = 0) {
  if (count <= 0) {
    playVoice(220, 0.05, 0.2, 0, 0.72);
    return;
  }
  const step = stepFor(count);
  playVoice(step.freq, step.gain * 0.8, Math.min(step.decay, 0.2), 0, 0.84);
}

/** Low thud when the combo is already full. */
export function playComboFull() {
  playVoice(185, 0.04, 0.12, 0, 0.8);
  playVoice(146.83, 0.034, 0.16, 0.07, 0.75);
}

/** Bright arpeggio when placing a combo. */
export function playComboPlace() {
  playVoice(659.25, 0.05, 0.28, 0);
  playVoice(880, 0.046, 0.34, 0.09);
  playVoice(1108.73, 0.04, 0.42, 0.18);
}
