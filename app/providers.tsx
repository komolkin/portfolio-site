"use client";

import { HeartRateProvider } from "@/lib/heartRateContext";
import { ThemeProvider } from "@/lib/themeContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <HeartRateProvider>{children}</HeartRateProvider>
    </ThemeProvider>
  );
}
