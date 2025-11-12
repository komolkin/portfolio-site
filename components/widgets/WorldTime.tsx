'use client';

import { useEffect, useState } from 'react';
import NumberFlow from '@number-flow/react';

function getTimeInTimezone(timezone: string): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: timezone }));
}

export default function WorldTime() {
  const [nyHours, setNyHours] = useState(0);
  const [nyMinutes, setNyMinutes] = useState(0);
  const [nySeconds, setNySeconds] = useState(0);
  const [parisHours, setParisHours] = useState(0);
  const [parisMinutes, setParisMinutes] = useState(0);
  const [parisSeconds, setParisSeconds] = useState(0);

  useEffect(() => {
    const updateTimes = () => {
      const nyDate = getTimeInTimezone('America/New_York');
      const parisDate = getTimeInTimezone('Europe/Paris');
      
      setNyHours(nyDate.getHours());
      setNyMinutes(nyDate.getMinutes());
      setNySeconds(nyDate.getSeconds());
      
      setParisHours(parisDate.getHours());
      setParisMinutes(parisDate.getMinutes());
      setParisSeconds(parisDate.getSeconds());
    };

    updateTimes();
    const interval = setInterval(updateTimes, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 w-[280px] space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground leading-[1.4]">New York</div>
        <div className="text-xs font-mono flex items-center gap-1 leading-[1.4]">
          <NumberFlow value={nyHours} format={{ minimumIntegerDigits: 2 }} />
          <span>:</span>
          <NumberFlow value={nyMinutes} format={{ minimumIntegerDigits: 2 }} />
          <span>:</span>
          <NumberFlow value={nySeconds} format={{ minimumIntegerDigits: 2 }} />
        </div>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="text-xs text-muted-foreground leading-[1.4]">Paris</div>
        <div className="text-xs font-mono flex items-center gap-1 leading-[1.4]">
          <NumberFlow value={parisHours} format={{ minimumIntegerDigits: 2 }} />
          <span>:</span>
          <NumberFlow value={parisMinutes} format={{ minimumIntegerDigits: 2 }} />
          <span>:</span>
          <NumberFlow value={parisSeconds} format={{ minimumIntegerDigits: 2 }} />
        </div>
      </div>
    </div>
  );
}

