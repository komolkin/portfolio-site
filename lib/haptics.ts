import { WebHaptics } from "web-haptics";

let client: WebHaptics | null = null;
let debug = false;

function haptics() {
  if (typeof window === "undefined") return null;
  if (!client) {
    client = new WebHaptics({ debug });
  }
  return client;
}

export function setHapticsDebug(on: boolean) {
  debug = on;
  haptics()?.setDebug(on);
}

export function getHapticsDebug() {
  return debug;
}

/** Light tap — buttons, chips, toggles */
export function hapticTap() {
  void haptics()?.trigger([{ duration: 14, intensity: 0.4 }]);
}

/** Soft tick — drag amount step changes */
export function hapticStep() {
  void haptics()?.trigger([{ duration: 8, intensity: 0.22 }]);
}

/** Stronger cue — combo arm */
export function hapticNudge() {
  void haptics()?.trigger("nudge");
}

/** Success confirmation */
export function hapticSuccess() {
  void haptics()?.trigger("success");
}

export function hapticWarning() {
  void haptics()?.trigger([
    { duration: 20, intensity: 0.45 },
    { delay: 80, duration: 20, intensity: 0.45 },
  ]);
}

export function hapticError() {
  void haptics()?.trigger("error");
}
