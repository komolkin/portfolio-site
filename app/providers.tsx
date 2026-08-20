"use client";

import { HeartRateProvider } from "@/lib/heartRateContext";
import { ThemeProvider } from "@/lib/themeContext";
import { SfxRoot } from "@/lib/useSfx";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <HeartRateProvider>
        <SfxRoot>{children}</SfxRoot>
      </HeartRateProvider>
    </ThemeProvider>
  );
}
