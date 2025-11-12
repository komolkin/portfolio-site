'use client';

import NumberFlow from '@number-flow/react';
import { useHeartRate } from '@/lib/heartRateContext';

export default function HeartRate() {
  const { bpm } = useHeartRate();

  return (
    <div className="p-4 w-[280px]">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground leading-[1.4]">Heart Rate</div>
        <div className="text-xs font-mono leading-[1.4]">
          <NumberFlow value={bpm} suffix=" BPM" />
        </div>
      </div>
    </div>
  );
}

