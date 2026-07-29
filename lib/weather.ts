const OPEN_METEO_ENDPOINT = "https://api.open-meteo.com/v1/forecast";
const PARIS_LAT = 48.8566;
const PARIS_LON = 2.3522;

/** Weather changes slowly — cache to avoid redundant upstream calls. */
const CACHE_TTL_MS = 15 * 60_000;

const fetchNoStore = {
  cache: "no-store" as const,
};

export type ParisWeather = {
  celsius: number;
  weatherCode: number;
};

export type WeatherCondition =
  | "clear"
  | "partly-cloudy"
  | "cloudy"
  | "rain"
  | "snow"
  | "thunderstorm";

/** Map Open-Meteo WMO weather codes to a small icon set. */
export function getWeatherCondition(code: number): WeatherCondition {
  if (code === 0 || code === 1) return "clear";
  if (code === 2) return "partly-cloudy";
  if (code === 3 || code === 45 || code === 48) return "cloudy";
  if (
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82)
  ) {
    return "rain";
  }
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return "snow";
  if (code >= 95) return "thunderstorm";
  return "cloudy";
}

type CacheEntry = {
  value: ParisWeather;
  expiresAt: number;
};

let cache: CacheEntry | null = null;
let inFlight: Promise<ParisWeather | null> | null = null;

export async function getParisWeather(): Promise<ParisWeather | null> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.value;
  }

  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const params = new URLSearchParams({
        latitude: String(PARIS_LAT),
        longitude: String(PARIS_LON),
        current: "temperature_2m,weather_code",
        timezone: "Europe/Paris",
      });

      const response = await fetch(`${OPEN_METEO_ENDPOINT}?${params}`, fetchNoStore);
      if (!response.ok) {
        console.error("Open-Meteo request failed:", response.status);
        return cache?.value ?? null;
      }

      const data = (await response.json()) as {
        current?: { temperature_2m?: number; weather_code?: number };
      };

      const celsius = data.current?.temperature_2m;
      const weatherCode = data.current?.weather_code;
      if (
        typeof celsius !== "number" ||
        !Number.isFinite(celsius) ||
        typeof weatherCode !== "number" ||
        !Number.isFinite(weatherCode)
      ) {
        return cache?.value ?? null;
      }

      const value = {
        celsius: Math.round(celsius),
        weatherCode,
      };
      cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
      return value;
    } catch (error) {
      console.error("Error fetching Paris weather:", error);
      return cache?.value ?? null;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}
