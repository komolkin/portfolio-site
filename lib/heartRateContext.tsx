"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

interface HeartRateContextType {
  bpm: number;
}

const HeartRateContext = createContext<HeartRateContextType | undefined>(
  undefined
);

const BPM_MIN = 63;
const BPM_MAX = 72;

export function HeartRateProvider({ children }: { children: ReactNode }) {
  const [bpm, setBpm] = useState(BPM_MAX);

  useEffect(() => {
    const interval = setInterval(() => {
      // Random BPM between 63-72
      setBpm(BPM_MIN + Math.floor(Math.random() * (BPM_MAX - BPM_MIN + 1)));
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  return (
    <HeartRateContext.Provider value={{ bpm }}>
      {children}
    </HeartRateContext.Provider>
  );
}

export function useHeartRate() {
  const context = useContext(HeartRateContext);
  if (context === undefined) {
    throw new Error("useHeartRate must be used within a HeartRateProvider");
  }
  return context;
}
