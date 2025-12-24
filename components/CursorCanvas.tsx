"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRealtime } from "@/lib/realtime-client";
import { motion, AnimatePresence } from "framer-motion";

// Generate a random color for the cursor
const CURSOR_COLORS = [
  "#FF6B6B", // Red
  "#4ECDC4", // Teal
  "#45B7D1", // Blue
  "#96CEB4", // Green
  "#FFEAA7", // Yellow
  "#DDA0DD", // Plum
  "#98D8C8", // Mint
  "#F7DC6F", // Gold
  "#BB8FCE", // Purple
  "#85C1E9", // Light Blue
];

function getRandomColor() {
  return CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];
}

function generateUserId() {
  return `user_${Math.random().toString(36).substring(2, 9)}`;
}

interface CursorData {
  id: string;
  x: number;
  y: number;
  color: string;
  name?: string;
  lastSeen: number;
}

// Cursor pointer SVG component
function CursorPointer({ color }: { color: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}
    >
      <path
        d="M5.65376 12.4561L4.65376 3.95605C4.55376 3.05605 5.55376 2.35605 6.35376 2.85605L20.3538 11.4561C21.1538 11.9561 21.0538 13.1561 20.1538 13.4561L13.6538 15.4561L10.6538 21.4561C10.1538 22.3561 8.85376 22.2561 8.55376 21.2561L5.65376 12.4561Z"
        fill={color}
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CursorCanvas() {
  const [cursors, setCursors] = useState<Map<string, CursorData>>(new Map());
  const userIdRef = useRef<string>("");
  const userColorRef = useRef<string>("");
  const lastEmitRef = useRef<number>(0);
  const throttleMs = 50; // Throttle cursor updates to 20 per second

  // Initialize user ID and color
  useEffect(() => {
    // Check if we have a stored user ID, otherwise generate one
    let storedId = sessionStorage.getItem("cursor_user_id");
    let storedColor = sessionStorage.getItem("cursor_user_color");

    if (!storedId) {
      storedId = generateUserId();
      sessionStorage.setItem("cursor_user_id", storedId);
    }
    if (!storedColor) {
      storedColor = getRandomColor();
      sessionStorage.setItem("cursor_user_color", storedColor);
    }

    userIdRef.current = storedId;
    userColorRef.current = storedColor;
  }, []);

  // Subscribe to cursor events
  useRealtime({
    events: ["cursor.move", "cursor.leave"],
    onData({ event, data }) {
      if (event === "cursor.move") {
        const cursorData = data as {
          id: string;
          x: number;
          y: number;
          color: string;
          name?: string;
        };

        // Don't show our own cursor
        if (cursorData.id === userIdRef.current) return;

        setCursors((prev) => {
          const next = new Map(prev);
          next.set(cursorData.id, {
            ...cursorData,
            lastSeen: Date.now(),
          });
          return next;
        });
      } else if (event === "cursor.leave") {
        const { id } = data as { id: string };
        setCursors((prev) => {
          const next = new Map(prev);
          next.delete(id);
          return next;
        });
      }
    },
  });

  // Emit cursor position
  const emitCursor = useCallback(async (x: number, y: number) => {
    const now = Date.now();
    if (now - lastEmitRef.current < throttleMs) return;
    lastEmitRef.current = now;

    // Convert to percentage of viewport for cross-device compatibility
    const xPercent = (x / window.innerWidth) * 100;
    const yPercent = (y / window.innerHeight) * 100;

    try {
      await fetch("/api/realtime/emit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "cursor.move",
          data: {
            id: userIdRef.current,
            x: xPercent,
            y: yPercent,
            color: userColorRef.current,
          },
        }),
      });
    } catch (error) {
      // Silently fail - cursor updates are not critical
    }
  }, []);

  // Track mouse movement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      emitCursor(e.clientX, e.clientY);
    };

    const handleMouseLeave = async () => {
      try {
        await fetch("/api/realtime/emit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "cursor.leave",
            data: { id: userIdRef.current },
          }),
        });
      } catch (error) {
        // Silently fail
      }
    };

    // Also emit leave on page unload
    const handleBeforeUnload = () => {
      navigator.sendBeacon(
        "/api/realtime/emit",
        JSON.stringify({
          event: "cursor.leave",
          data: { id: userIdRef.current },
        })
      );
    };

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [emitCursor]);

  // Clean up stale cursors (not seen in 5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCursors((prev) => {
        const next = new Map(prev);
        for (const [id, cursor] of next) {
          if (now - cursor.lastSeen > 5000) {
            next.delete(id);
          }
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      <AnimatePresence>
        {Array.from(cursors.values()).map((cursor) => (
          <motion.div
            key={cursor.id}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{
              opacity: 1,
              scale: 1,
              x:
                (cursor.x / 100) *
                (typeof window !== "undefined" ? window.innerWidth : 0),
              y:
                (cursor.y / 100) *
                (typeof window !== "undefined" ? window.innerHeight : 0),
            }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{
              type: "spring",
              damping: 30,
              stiffness: 500,
              mass: 0.5,
            }}
            className="absolute top-0 left-0"
            style={{ willChange: "transform" }}
          >
            <CursorPointer color={cursor.color} />
            {cursor.name && (
              <div
                className="ml-4 mt-4 px-2 py-1 rounded-md text-xs font-medium text-white whitespace-nowrap"
                style={{ backgroundColor: cursor.color }}
              >
                {cursor.name}
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
