const BOUNCE_SRC = "/playground/ball/soccer-ball-bounce.mp3";

let bounceAudio: HTMLAudioElement | null = null;

function getBounceAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!bounceAudio) {
    bounceAudio = new Audio(BOUNCE_SRC);
    bounceAudio.preload = "auto";
  }
  return bounceAudio;
}

/** Prime audio on first user gesture (autoplay policy). */
export async function resumeBallAudio(): Promise<void> {
  const audio = getBounceAudio();
  if (!audio) return;
  try {
    audio.muted = true;
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    audio.muted = false;
  } catch {
    // Autoplay policy — fail silently
  }
}

export function playTapBounceSound(): void {
  const audio = getBounceAudio();
  if (!audio) return;

  try {
    const clip = audio.cloneNode() as HTMLAudioElement;
    clip.volume = 0.85;
    void clip.play();
  } catch {
    // Fail silently if audio is blocked
  }
}
