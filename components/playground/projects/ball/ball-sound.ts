let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioContext) audioContext = new AudioCtx();
  return audioContext;
}

export async function resumeBallAudio(): Promise<void> {
  const context = getAudioContext();
  if (!context || context.state !== "suspended") return;
  try {
    await context.resume();
  } catch {
    // Autoplay policy — fail silently
  }
}

/** Short boing on tap — synthesized bounce, no asset file */
export function playTapBounceSound(): void {
  const context = getAudioContext();
  if (!context) return;

  try {
    const now = context.currentTime;

    const master = context.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.22, now + 0.008);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    master.connect(context.destination);

    const tone = context.createOscillator();
    const toneGain = context.createGain();
    tone.type = "sine";
    tone.frequency.setValueAtTime(380, now);
    tone.frequency.exponentialRampToValueAtTime(165, now + 0.09);

    toneGain.gain.setValueAtTime(0.0001, now);
    toneGain.gain.exponentialRampToValueAtTime(0.5, now + 0.006);
    toneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

    tone.connect(toneGain);
    toneGain.connect(master);
    tone.start(now);
    tone.stop(now + 0.12);

    const thump = context.createOscillator();
    const thumpGain = context.createGain();
    thump.type = "triangle";
    thump.frequency.setValueAtTime(120, now);
    thump.frequency.exponentialRampToValueAtTime(70, now + 0.05);

    thumpGain.gain.setValueAtTime(0.0001, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.28, now + 0.004);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

    thump.connect(thumpGain);
    thumpGain.connect(master);
    thump.start(now);
    thump.stop(now + 0.08);
  } catch {
    // Fail silently if audio is blocked
  }
}
