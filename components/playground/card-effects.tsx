"use client";

export const CARD_EFFECTS = [
  { id: "default", label: "Default" },
  { id: "magic", label: "Magic" },
  { id: "shiny", label: "Shiny" },
  { id: "frost", label: "Frost" },
  { id: "prism", label: "Prism" },
  { id: "ember", label: "Ember" },
] as const;

export type CardEffectId = (typeof CARD_EFFECTS)[number]["id"];

const IMG_CHEVRON = "/playground/expandable/chevron-16.svg";

export const CARD_EFFECT_SELECT_CLASS =
  "h-9 w-full cursor-pointer appearance-none rounded-full border border-white/10 bg-white/[0.06] py-0 pl-4 pr-9 text-sm font-medium text-white shadow-[inset_0_0_4px_rgba(255,255,255,0.18)] outline-none transition-[border-color,background-color] duration-150 hover:border-white/20 hover:bg-white/[0.08] focus-visible:border-white/30";

/**
 * Soft halo around the card for Magic. Sibling outside overflow-hidden
 * (same pattern as MagicSparkles) — avoid negative z-index.
 */
export function CardEffectAura({ effect }: { effect: CardEffectId }) {
  if (effect !== "magic") return null;
  return (
    <div aria-hidden className="pointer-events-none absolute -inset-10">
      <div className="live-preview-magic-card-aura absolute inset-0 rounded-[2.5rem]" />
    </div>
  );
}

export function CardEffectSelect({
  value,
  onChange,
  className,
}: {
  value: CardEffectId;
  onChange: (value: CardEffectId) => void;
  className?: string;
}) {
  return (
    <div className={`relative min-w-0 ${className ?? ""}`}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as CardEffectId)}
        className={CARD_EFFECT_SELECT_CLASS}
        aria-label="Card effect"
      >
        {CARD_EFFECTS.map((entry) => (
          <option
            key={entry.id}
            value={entry.id}
            className="bg-[#1a1a1a] text-white"
          >
            {entry.label}
          </option>
        ))}
      </select>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={IMG_CHEVRON}
        alt=""
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 opacity-45"
        draggable={false}
      />
    </div>
  );
}

export function CardEffectSurface({ effect }: { effect: CardEffectId }) {
  if (effect === "shiny") return <ShinySurface />;
  if (effect === "frost") return <FrostSurface />;
  if (effect === "prism") return <PrismSurface />;
  if (effect === "ember") return <EmberSurface />;
  return null;
}

function ShinySurface() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
    >
      <div className="live-preview-shiny-ambient absolute inset-0" />
      <div className="live-preview-shiny-glow absolute -inset-[45%]" />
      <div className="absolute inset-x-[8%] top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent opacity-70" />
      <div className="absolute inset-x-[18%] top-[1px] h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <div className="live-preview-effect-border live-preview-shiny-rim absolute inset-0 overflow-hidden rounded-[inherit]">
        <div className="live-preview-shiny-border-spin absolute top-1/2 left-1/2 aspect-square w-[190%] -translate-x-1/2 -translate-y-1/2" />
      </div>
    </div>
  );
}

function FrostSurface() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
    >
      <div className="live-preview-frost-mist absolute -inset-[30%]" />
      <div className="live-preview-frost-grain absolute inset-0 opacity-[0.18]" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] via-transparent to-white/[0.03]" />
    </div>
  );
}

function PrismSurface() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
    >
      <div className="live-preview-prism-wash absolute inset-0" />
      <div className="live-preview-prism-caustic absolute -inset-[25%]" />
      <div className="live-preview-prism-topline absolute inset-x-[12%] top-0 h-px" />
      <div className="live-preview-effect-border live-preview-prism-rim absolute inset-0 overflow-hidden rounded-[inherit]">
        <div className="live-preview-prism-border-spin absolute top-1/2 left-1/2 aspect-square w-[190%] -translate-x-1/2 -translate-y-1/2" />
      </div>
    </div>
  );
}

function EmberSurface() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
    >
      <div className="live-preview-ember-glow absolute -inset-[35%]" />
      <div className="live-preview-ember-edge absolute inset-0 rounded-[inherit]" />
    </div>
  );
}
