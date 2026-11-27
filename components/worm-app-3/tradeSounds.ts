import { playPreset, type Preset } from "@/lib/sfx";

// Bencho's Web Audio sound presets: https://bencho.dev/sounds/press-count
const PRESS_COUNT: Preset = {
  masterGain: 1,
  layers: [
    { kind: "noise", filterType: "bandpass", filterFrequency: 900, filterQ: 2, sweep: { frequency: 1800, duration: 0.6 }, attack: 0.15, decay: 0.568, peak: 0.076, sustained: true, linearAttack: true, endGain: 0.0001 },
    { kind: "noise", filterType: "lowpass", filterFrequency: 200, filterQ: 0.7, sweep: { frequency: 500, duration: 0.6 }, attack: 0.15, decay: 0.594, peak: 0.057, sustained: true, linearAttack: true, endGain: 0.0001 },
    { kind: "noise", filterType: "bandpass", filterFrequency: 2600, filterQ: 4, sweep: { frequency: 3600, duration: 0.6 }, attack: 0.15, decay: 0.587, peak: 0.019, sustained: true, linearAttack: true, endGain: 0.0001 },
  ],
};

// https://bencho.dev/sounds/landed
const LANDED: Preset = {
  masterGain: 1,
  layers: [
    { kind: "tone", waveform: "triangle", frequency: 330, sweep: { frequency: 620, duration: 0.12 }, lowpass: 1400, attack: 0.03, decay: 0.09, peak: 0.018, endGain: 0.0001 },
    { kind: "tone", waveform: "sine", frequency: 784, lowpass: 2600, attack: 0.004, decay: 0.116, peak: 0.04, offset: 0.07, endGain: 0.0001 },
    { kind: "tone", waveform: "sine", frequency: 1047, lowpass: 2800, attack: 0.004, decay: 0.126, peak: 0.04, offset: 0.14, endGain: 0.0001 },
    { kind: "tone", waveform: "sine", frequency: 1319, lowpass: 3000, attack: 0.005, decay: 0.515, peak: 0.044, offset: 0.21, endGain: 0.0001 },
    { kind: "tone", waveform: "sine", frequency: 2638, attack: 0.008, decay: 0.312, peak: 0.007, offset: 0.215, endGain: 0.0001 },
  ],
};

export const playTradeConfirm = () => playPreset(PRESS_COUNT);
export const playTradeSuccess = () => playPreset(LANDED);
