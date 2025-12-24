"use client";

import { RealtimeProvider } from "@upstash/realtime/client";
import { HeartRateProvider } from "@/lib/heartRateContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <RealtimeProvider>
      <HeartRateProvider>{children}</HeartRateProvider>
    </RealtimeProvider>
  );
}
