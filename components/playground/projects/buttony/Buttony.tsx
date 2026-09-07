"use client";

/**
 * Outcome buttons from Figma frame (node 12972:66059):
 * https://www.figma.com/design/XSjBMcMS96jS8ntZIpMukQ/Ilya?node-id=12972-66059
 */
const OUTCOMES = [
  { id: "everton", label: "Everton", price: "40¢", color: "#a7a8ff" },
  { id: "draw", label: "Draw", price: "34¢", color: "#c5c5c5" },
  { id: "man-united", label: "Man United", price: "26¢", color: "#fce40d" },
] as const;

export default function Buttony() {
  return (
    <div
      className="flex h-full w-full items-center justify-center px-4"
      role="group"
      aria-label="Match outcomes"
    >
      <div className="flex items-center gap-2 [zoom:0.72] sm:[zoom:0.9] md:[zoom:1]">
        {OUTCOMES.map((outcome) => (
          <button
            key={outcome.id}
            type="button"
            data-sfx="click"
            className="group relative flex shrink-0 items-center justify-center gap-1 rounded-2xl px-6 pb-[18px] pt-[14px] transition-transform duration-200 ease-out [font-feature-settings:'lnum'_1,'tnum'_1] select-none hover:-translate-y-[2px] active:translate-y-1 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80"
            style={{ backgroundColor: outcome.color }}
          >
            <span className="relative whitespace-nowrap text-base font-semibold leading-[1.25] text-[#141414]">
              {outcome.label}
            </span>
            <span className="relative whitespace-nowrap text-base font-semibold leading-[1.25] text-[#141414]/60">
              {outcome.price}
            </span>
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0px_-4px_0px_0px_rgba(0,0,0,0.3)] transition-shadow duration-150 ease-out group-active:shadow-[inset_0px_-1px_0px_0px_rgba(0,0,0,0.3)]"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
