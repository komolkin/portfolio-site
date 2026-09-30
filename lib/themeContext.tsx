"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  BG_MODE_KEY,
  DEFAULT_BG_MODE,
  type BgMode,
} from "@/lib/bgMode";

export type { BgMode };
export { BG_MODE_KEY, DEFAULT_BG_MODE };

interface ThemeContextType {
  theme: "dark";
  bgMode: BgMode;
  setBgMode: (mode: BgMode) => void;
  toggleBgMode: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  bgMode: DEFAULT_BG_MODE,
  setBgMode: () => {},
  toggleBgMode: () => {},
});

function applyBgMode(mode: BgMode) {
  document.documentElement.dataset.bg = mode;
}

function readStoredBgMode(): BgMode {
  try {
    const stored = localStorage.getItem(BG_MODE_KEY);
    if (stored === "flat" || stored === "gradient") return stored;
  } catch {
    // ignore
  }
  return DEFAULT_BG_MODE;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [bgMode, setBgModeState] = useState<BgMode>(DEFAULT_BG_MODE);

  useEffect(() => {
    const mode = readStoredBgMode();
    setBgModeState(mode);
    applyBgMode(mode);
  }, []);

  const setBgMode = useCallback((mode: BgMode) => {
    setBgModeState(mode);
    applyBgMode(mode);
    try {
      localStorage.setItem(BG_MODE_KEY, mode);
    } catch {
      // ignore
    }
  }, []);

  const toggleBgMode = useCallback(() => {
    setBgModeState((prev) => {
      const next: BgMode = prev === "gradient" ? "flat" : "gradient";
      applyBgMode(next);
      try {
        localStorage.setItem(BG_MODE_KEY, next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider
      value={{ theme: "dark", bgMode, setBgMode, toggleBgMode }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
