import type { WeatherCondition } from "@/lib/weather";

type WeatherIconProps = {
  condition: WeatherCondition;
  className?: string;
};

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  vectorEffect: "non-scaling-stroke" as const,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export default function WeatherIcon({ condition, className }: WeatherIconProps) {
  switch (condition) {
    case "clear":
      return (
        <svg {...iconProps} className={className}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      );
    case "partly-cloudy":
      return (
        <svg {...iconProps} className={className}>
          <path d="M13 4.5a4 4 0 0 0-4 4.2 3.5 3.5 0 0 0-1.5 6.8h9.5a3 3 0 0 0 0-6 3.5 3.5 0 0 0-4-5z" />
          <path d="M18 5.5h.01M16.5 3.5h.01" />
        </svg>
      );
    case "cloudy":
      return (
        <svg {...iconProps} className={className}>
          <path d="M7 18h10.5a3.5 3.5 0 0 0 .4-7 4.5 4.5 0 0 0-8.7-1.5A3.5 3.5 0 0 0 7 18z" />
        </svg>
      );
    case "rain":
      return (
        <svg {...iconProps} className={className}>
          <path d="M7 16h10.5a3.5 3.5 0 0 0 .4-7 4.5 4.5 0 0 0-8.7-1.5A3.5 3.5 0 0 0 7 16z" />
          <path d="M9 19v2M12 18v2M15 19v2" />
        </svg>
      );
    case "snow":
      return (
        <svg {...iconProps} className={className}>
          <path d="M7 15h10.5a3.5 3.5 0 0 0 .4-7 4.5 4.5 0 0 0-8.7-1.5A3.5 3.5 0 0 0 7 15z" />
          <path d="M8 19l1.5 1.5M8 21l1.5-1.5M16 19l-1.5 1.5M16 21l-1.5-1.5M12 18v4M10.5 20h3" />
        </svg>
      );
    case "thunderstorm":
      return (
        <svg {...iconProps} className={className}>
          <path d="M7 14h10.5a3.5 3.5 0 0 0 .4-7 4.5 4.5 0 0 0-8.7-1.5A3.5 3.5 0 0 0 7 14z" />
          <path d="M13 16l-2 4h2l-1 3" />
        </svg>
      );
  }
}
