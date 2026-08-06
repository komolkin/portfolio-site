"use client";

type AnalogueClockProps = {
  hours: number;
  minutes: number;
  seconds: number;
  className?: string;
};

export default function AnalogueClock({
  hours,
  minutes,
  seconds,
  className,
}: AnalogueClockProps) {
  const secondAngle = (seconds / 60) * 360;
  const minuteAngle = ((minutes + seconds / 60) / 60) * 360;
  const hourAngle = (((hours % 12) + minutes / 60 + seconds / 3600) / 12) * 360;

  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
    >
      {/* Hour hand */}
      <line
        x1="50"
        y1="50"
        x2="50"
        y2="28"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        transform={`rotate(${hourAngle} 50 50)`}
      />
      {/* Minute hand */}
      <line
        x1="50"
        y1="50"
        x2="50"
        y2="18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        transform={`rotate(${minuteAngle} 50 50)`}
      />
      {/* Second hand */}
      <line
        x1="50"
        y1="54"
        x2="50"
        y2="12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.55"
        transform={`rotate(${secondAngle} 50 50)`}
      />
    </svg>
  );
}
