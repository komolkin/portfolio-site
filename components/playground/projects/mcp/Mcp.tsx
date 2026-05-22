"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { McpPointerRef } from "@/components/playground/projects/mcp/McpCanvas3D";

const McpCanvas3D = dynamic(
  () => import("@/components/playground/projects/mcp/McpCanvas3D"),
  { ssr: false },
);

export default function Mcp() {
  const areaRef = useRef<HTMLDivElement>(null);
  const [areaSize, setAreaSize] = useState({ width: 0, height: 0 });
  const pointerRef = useRef<McpPointerRef["current"]>({ x: 0, y: 0 });

  const measure = useCallback(() => {
    const el = areaRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setAreaSize({ width, height });
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const el = areaRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    pointerRef.current = {
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: -(((e.clientY - rect.top) / rect.height) * 2 - 1),
    };
  }, []);

  const handlePointerLeave = useCallback(() => {
    pointerRef.current = { x: 0, y: 0 };
  }, []);

  useEffect(() => {
    measure();
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  return (
    <div
      ref={areaRef}
      className="relative h-full w-full touch-none select-none"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      aria-label="MCP — move cursor to interact with the smiley sphere"
    >
      <McpCanvas3D pointer={pointerRef} width={areaSize.width} height={areaSize.height} />
    </div>
  );
}
