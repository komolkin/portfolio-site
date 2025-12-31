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
      <div className="bg-black/40 backdrop-blur-md text-white px-2.5 py-1.5 rounded-[6px] text-[15px] whitespace-nowrap">
        {text}
      </div>
    </div>
  );
}
