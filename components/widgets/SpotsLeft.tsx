'use client';

import NumberFlow from '@number-flow/react';

export default function SpotsLeft() {
  const spots = 3;

  const getDotColor = (count: number) => {
    if (count >= 3) return 'bg-green-500';
    if (count === 2) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="p-4 w-[280px]">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground leading-[1.4]">Spots left</div>
        <div className="text-xs font-mono leading-[1.4] flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${getDotColor(spots)}`} />
          <NumberFlow value={spots} />
        </div>
      </div>
    </div>
  );
}
