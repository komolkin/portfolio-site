import { WebHaptics } from "web-haptics";

type TriggerFn = WebHaptics["trigger"];

let boundTrigger: TriggerFn | null = null;
let client: WebHaptics | null = null;
let debugFlag = false;
let unlocked = false;

/**
 * Lochie's web-haptics (https://haptics.lochie.me):
 * - Vibration API when available
 * - Plus hidden `input[switch]` click + optional audio when `debug` is on
 *
 * We keep `debug: true` always so the switch/audio path still runs when
 * `navigator.vibrate` exists but is a no-op (common on http://LAN:port).
 */
function getClient() {
  if (typeof window === "undefined") return null;
  if (!client) {
    client = new WebHaptics({ debug: true, showSwitch: false });
  }
  return client;
}

/** Wired by HapticsProvider (`useWebHaptics` from web-haptics/react). */
export function bindHapticsTrigger(trigger: TriggerFn | null) {
  boundTrigger = trigger;
}

async function fire(
  input: Parameters<TriggerFn>[0],
  options?: Parameters<TriggerFn>[1],
) {
  const api = getClient();
  // Prefer the React-hook instance (same as the demo), else vanilla fallback.
  const run = boundTrigger ?? api?.trigger.bind(api);
  if (!run) return;

  // Direct vibrate in this turn — some browsers drop vibrate after awaits.
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(12);
    }
  } catch {
    /* ignore */
  }

  await run(input, options);
}

export function setHapticsDebug(on: boolean) {
  debugFlag = on;
  // Library debug stays on for the switch/audio technique; this flag is for /dev/sfx UI.
  getClient()?.setDebug(true);
}

export function getHapticsDebug() {
  return debugFlag;
}

/** Call from a real pointer/click gesture so AudioContext can start. */
export function unlockHaptics() {
  if (typeof window === "undefined" || unlocked) return;
  unlocked = true;
  // Prime DOM switch + AudioContext inside the user gesture (Lochie's path).
  void fire([{ duration: 1, intensity: 0.05 }]);
}

/** Light tap — buttons, chips, toggles */
export function hapticTap() {
  unlockHaptics();
  void fire([{ duration: 30, intensity: 0.85 }]);
}

/** Soft tick — drag amount step changes (must run inside pointer gesture) */
export function hapticStep() {
  unlockHaptics();
  void fire("selection");
}

/** Stronger cue — combo arm */
export function hapticNudge() {
  unlockHaptics();
  void fire("nudge");
}

/** Success confirmation */
export function hapticSuccess() {
  unlockHaptics();
  void fire("success");
}

export function hapticWarning() {
  unlockHaptics();
  void fire("warning");
}

export function hapticError() {
  unlockHaptics();
  void fire("error");
}
