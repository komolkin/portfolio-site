"use client";

import { RealtimeProvider } from "@upstash/realtime/client";
import { HeartRateProvider } from "@/lib/heartRateContext";
import { ThemeProvider } from "@/lib/themeContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <RealtimeProvider>
        <HeartRateProvider>{children}</HeartRateProvider>
      </RealtimeProvider>
    </ThemeProvider>
  );
}
