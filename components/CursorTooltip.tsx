"use client";

import { useEffect, useState, useCallback } from "react";

interface CursorTooltipProps {
  text: string | null;
  isActive: boolean;
}

export default function CursorTooltip({ text, isActive }: CursorTooltipProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    setPosition({ x: e.clientX, y: e.clientY });
  }, []);

  useEffect(() => {
    if (isActive && text) {
      window.addEventListener("mousemove", handleMouseMove);
      // Small delay to make the tooltip appear smoother
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        clearTimeout(timer);
      };
    } else {
      setIsVisible(false);
    }
  }, [isActive, text, handleMouseMove]);

  if (!text) return null;

  return (
    <>
      {isVisible && (
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
      )}
    </>
  );
}

