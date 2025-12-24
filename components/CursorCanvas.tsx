"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRealtime } from "@/lib/realtime-client";
import { motion, AnimatePresence } from "framer-motion";

// Figma-like color palette
const CURSOR_COLORS = [
  "#F24822", // Red-Orange
  "#FFC700", // Yellow
  "#14AE5C", // Green
  "#0D99FF", // Blue
  "#9747FF", // Purple
  "#FF6B6B", // Coral
  "#1ABCFE", // Cyan
  "#A259FF", // Violet
  "#FF7262", // Salmon
  "#00C48C", // Emerald
];

// Random name lists for generating Figma-like names
const FIRST_NAMES = [
  "Alex",
  "Jordan",
  "Taylor",
  "Morgan",
  "Casey",
  "Riley",
  "Quinn",
  "Avery",
  "Blake",
  "Cameron",
  "Drew",
  "Emery",
  "Finley",
  "Gray",
  "Harper",
  "Indigo",
  "Jamie",
  "Kendall",
  "Lane",
  "Madison",
  "Noah",
  "Oakley",
  "Parker",
  "Reese",
  "Sage",
  "Tatum",
  "Umber",
  "Vale",
  "Winter",
  "Zara",
  "Aiden",
  "Bailey",
  "Charlie",
  "Dakota",
  "Eden",
  "Flynn",
  "Genesis",
  "Hayden",
  "Iris",
  "Jesse",
  "Kai",
  "London",
  "Marley",
  "Nico",
  "Ocean",
  "Phoenix",
  "River",
  "Sawyer",
  "Teagan",
  "Uma",
  "Vesper",
  "Wren",
  "Xen",
  "Yuki",
  "Zephyr",
  "Aria",
  "Bellamy",
  "Cruz",
  "Devin",
  "Ellis",
  "Frankie",
  "Gemma",
  "Haven",
  "Ira",
];

const LAST_NAMES = [
  "Anderson",
  "Bennett",
  "Carter",
  "Davis",
  "Evans",
  "Foster",
  "Garcia",
  "Harris",
  "Ibrahim",
  "Johnson",
  "Kim",
  "Lee",
  "Martinez",
  "Nelson",
  "O'Brien",
  "Patel",
  "Quinn",
  "Robinson",
  "Smith",
  "Taylor",
  "Upton",
  "Valdez",
  "Williams",
  "Xavier",
  "Young",
  "Zhang",
  "Adams",
  "Brooks",
  "Clark",
  "Diaz",
  "Edwards",
  "Fisher",
  "Green",
  "Hall",
  "Ingram",
  "Jones",
  "King",
  "Lopez",
  "Moore",
  "Nguyen",
  "Ortiz",
  "Parker",
  "Reed",
  "Scott",
  "Thomas",
  "Underwood",
  "Vargas",
  "White",
  "York",
  "Zimmerman",
  "Baker",
  "Campbell",
  "Douglas",
  "Ellis",
  "Franklin",
  "Grant",
  "Hayes",
  "Irving",
  "Jackson",
  "Knight",
  "Lambert",
  "Mitchell",
  "Nash",
  "Oliver",
];

function getRandomColor() {
  return CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];
}

function generateRandomName() {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${firstName} ${lastName}`;
}

function generateUserId() {
  return `user_${Math.random().toString(36).substring(2, 9)}`;
}

interface CursorData {
  id: string;
  x: number;
  y: number;
  color: string;
  name: string;
  lastSeen: number;
}

// Figma-style cursor pointer SVG
function CursorPointer({ color }: { color: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}
    >
      <path
        d="M4.5 3L16 10L10 11.5L7.5 17.5L4.5 3Z"
        fill={color}
        stroke="white"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CursorCanvas() {
  const [cursors, setCursors] = useState<Map<string, CursorData>>(new Map());
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const userIdRef = useRef<string>("");
  const userColorRef = useRef<string>("");
  const userNameRef = useRef<string>("");
  const lastEmitRef = useRef<number>(0);
  const throttleMs = 50; // Throttle cursor updates to 20 per second

  // Track window size for cursor positioning
  useEffect(() => {
    const updateSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Initialize user ID, color, and name
  useEffect(() => {
    let storedId = sessionStorage.getItem("cursor_user_id");
    let storedColor = sessionStorage.getItem("cursor_user_color");
    let storedName = sessionStorage.getItem("cursor_user_name");

    if (!storedId) {
      storedId = generateUserId();
      sessionStorage.setItem("cursor_user_id", storedId);
    }
    if (!storedColor) {
      storedColor = getRandomColor();
      sessionStorage.setItem("cursor_user_color", storedColor);
    }
    if (!storedName) {
      storedName = generateRandomName();
      sessionStorage.setItem("cursor_user_name", storedName);
    }

    userIdRef.current = storedId;
    userColorRef.current = storedColor;
    userNameRef.current = storedName;
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
          name: string;
        };

        // Don't show our own cursor - we only see others' cursors (Figma behavior)
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
            name: userNameRef.current,
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
              x: (cursor.x / 100) * windowSize.width,
              y: (cursor.y / 100) * windowSize.height,
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
            {/* Cursor pointer */}
            <CursorPointer color={cursor.color} />

            {/* Name label - positioned below and to the right of cursor */}
            <div
              className="absolute left-4 top-4 px-2 py-1 rounded text-xs font-medium text-white whitespace-nowrap shadow-lg"
              style={{ backgroundColor: cursor.color }}
            >
              {cursor.name}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
