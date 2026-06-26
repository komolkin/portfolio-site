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

export function HeartRateProvider({ children }: { children: ReactNode }) {
  const [bpm, setBpm] = useState(72);

  useEffect(() => {
    const interval = setInterval(() => {
      // Random BPM between 66-79
      setBpm(66 + Math.floor(Math.random() * 14));
    }, 10000);

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
