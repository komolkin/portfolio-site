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
  isBgMode,
  nextBgMode,
  type BgMode,
} from "@/lib/bgMode";

export type { BgMode };
export { BG_MODE_KEY, DEFAULT_BG_MODE };

interface ThemeContextType {
  theme: "dark";
  bgMode: BgMode;
  /** Hide header nav + playground project selector. */
  chromeHidden: boolean;
  setBgMode: (mode: BgMode) => void;
  toggleBgMode: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  bgMode: DEFAULT_BG_MODE,
  chromeHidden: false,
  setBgMode: () => {},
  toggleBgMode: () => {},
});

function applyBgMode(mode: BgMode) {
  // Focus keeps a solid page bg; only gradient has special CSS hooks.
  document.documentElement.dataset.bg = mode === "gradient" ? "gradient" : "flat";
  document.documentElement.dataset.chrome = mode === "focus" ? "off" : "on";
}

function readStoredBgMode(): BgMode {
  try {
    const stored = localStorage.getItem(BG_MODE_KEY);
    if (isBgMode(stored)) return stored;
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
      const next = nextBgMode(prev);
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
      value={{
        theme: "dark",
        bgMode,
        chromeHidden: bgMode === "focus",
        setBgMode,
        toggleBgMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
