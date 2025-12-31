"use client";

import { useEffect, useRef } from "react";

const SELECTION_COLORS = [
  "#ff6b6b", // coral red
  "#4ecdc4", // teal
  "#ffe66d", // yellow
  "#95e1d3", // mint
  "#f38181", // salmon
  "#aa96da", // lavender
];

export default function SelectionColor() {
  const lastColorRef = useRef<string | null>(null);

  useEffect(() => {
    const handleSelectionStart = () => {
      // Filter out the last used color to avoid repeats
      const availableColors = SELECTION_COLORS.filter(
        (color) => color !== lastColorRef.current
      );
      const randomColor =
        availableColors[Math.floor(Math.random() * availableColors.length)];
      
      lastColorRef.current = randomColor;
      document.documentElement.style.setProperty(
        "--selection-color",
        randomColor
      );
    };

    document.addEventListener("selectstart", handleSelectionStart);

    return () => {
      document.removeEventListener("selectstart", handleSelectionStart);
    };
  }, []);

  return null;
}

