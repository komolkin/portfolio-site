import type { WeatherCondition } from "@/lib/weather";

type WeatherIconProps = {
  condition: WeatherCondition;
  className?: string;
};

export default function WeatherIcon({ condition, className }: WeatherIconProps) {
  switch (condition) {
    case "clear":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
          className={className}
        >
          <circle cx="12" cy="12" r="4.25" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <rect
              key={deg}
              x="11.25"
              y="1.5"
              width="1.5"
              height="3.25"
              rx="0.75"
              transform={`rotate(${deg} 12 12)`}
            />
          ))}
        </svg>
      );
    case "partly-cloudy":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
          className={className}
        >
          <circle cx="8.5" cy="8" r="3.25" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <rect
              key={deg}
              x="7.85"
              y="2.1"
              width="1.3"
              height="2.2"
              rx="0.65"
              transform={`rotate(${deg} 8.5 8)`}
            />
          ))}
          <path d="M9.2 11.2a4.2 4.2 0 0 1 7.7 1.6 3.4 3.4 0 1 1 .55 6.75H8.4a3.6 3.6 0 0 1-.2-7.2 4.1 4.1 0 0 1 1-.15z" />
        </svg>
      );
    case "cloudy":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
          className={className}
        >
          <path d="M8.2 18.5h9.1a3.65 3.65 0 0 0 .55-7.25 4.7 4.7 0 0 0-8.95-1.7A3.7 3.7 0 0 0 8.2 18.5z" />
        </svg>
      );
    case "rain":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
          className={className}
        >
          <path d="M8.2 15.5h9.1a3.65 3.65 0 0 0 .55-7.25 4.7 4.7 0 0 0-8.95-1.7A3.7 3.7 0 0 0 8.2 15.5z" />
          <rect x="8.35" y="17.25" width="1.4" height="4" rx="0.7" />
          <rect x="11.3" y="16.75" width="1.4" height="4" rx="0.7" />
          <rect x="14.25" y="17.25" width="1.4" height="4" rx="0.7" />
        </svg>
      );
    case "snow":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
          className={className}
        >
          <path d="M8.2 14.75h9.1a3.65 3.65 0 0 0 .55-7.25 4.7 4.7 0 0 0-8.95-1.7A3.7 3.7 0 0 0 8.2 14.75z" />
          <circle cx="9.1" cy="18.4" r="1" />
          <circle cx="12" cy="17.6" r="1" />
          <circle cx="14.9" cy="18.4" r="1" />
          <circle cx="10.5" cy="20.6" r="0.85" />
          <circle cx="13.5" cy="20.6" r="0.85" />
        </svg>
      );
    case "thunderstorm":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
          className={className}
        >
          <path d="M8.2 14h9.1a3.65 3.65 0 0 0 .55-7.25 4.7 4.7 0 0 0-8.95-1.7A3.7 3.7 0 0 0 8.2 14z" />
          <path d="M13.4 14.75h-2.3l-1.55 4.1h1.85l-1.2 4.4 4.55-5.85h-2.15z" />
        </svg>
      );
  }
}
