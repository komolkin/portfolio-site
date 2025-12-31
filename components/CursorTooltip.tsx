"use client";

interface CursorTooltipProps {
  text: string | null;
  isActive: boolean;
  position: { x: number; y: number };
}

export default function CursorTooltip({ text, isActive, position }: CursorTooltipProps) {
  if (!text || !isActive) return null;

  return (
    <div
      className="fixed pointer-events-none z-[9998]"
      style={{
        left: position.x + 16,
        top: position.y + 16,
      }}
    >
      <div className="bg-black/80 text-white px-3 py-2 rounded-[6px] text-[15px] font-medium whitespace-nowrap">
        {text}
      </div>
    </div>
  );
}
