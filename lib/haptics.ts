import { WebHaptics } from "web-haptics";

type TriggerFn = WebHaptics["trigger"];

let boundTrigger: TriggerFn | null = null;
let fallback: WebHaptics | null = null;
let debug = false;

function audioFallback() {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.vibrate !== "function"
  );
}

function fallbackClient() {
  if (typeof window === "undefined") return null;
  if (!fallback) {
    // Match https://haptics.lochie.me — audio debug path when Vibration API is missing (iOS).
    fallback = new WebHaptics({ debug: debug || audioFallback() });
  }
  return fallback;
}

/** Wired by HapticsProvider (web-haptics/react), same pattern as the Lochie demo. */
export function bindHapticsTrigger(trigger: TriggerFn | null) {
  boundTrigger = trigger;
}

const trigger: TriggerFn = (input, options) => {
  if (boundTrigger) return boundTrigger(input, options);
  const client = fallbackClient();
  if (!client) return Promise.resolve();
  return client.trigger(input, options);
};

export function setHapticsDebug(on: boolean) {
  debug = on;
  const next = on || audioFallback();
  fallback?.setDebug(next);
}

export function getHapticsDebug() {
  return debug;
}

export function unlockHaptics() {
  // Instance is created by the React provider on mount; nothing else to prime.
  if (!boundTrigger) fallbackClient();
}

/** Light tap — buttons, chips, toggles */
export function hapticTap() {
  void trigger([{ duration: 25, intensity: 0.7 }]);
}

/** Soft tick — drag amount step changes (call from onDrag / pointer handlers) */
export function hapticStep() {
  void trigger("selection");
}

/** Stronger cue — combo arm */
export function hapticNudge() {
  void trigger("nudge");
}

/** Success confirmation */
export function hapticSuccess() {
  void trigger("success");
}

export function hapticWarning() {
  void trigger("warning");
}

export function hapticError() {
  void trigger("error");
}
