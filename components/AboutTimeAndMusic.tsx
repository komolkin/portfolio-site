"use client";

import { useEffect, useState } from "react";
import NumberFlow from "@number-flow/react";

function getTimeInTimezone(timezone: string): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: timezone }));
}

interface SpotifyTrack {
  title: string;
  artist: string;
  artwork: string;
  url: string;
}

interface SpotifyData {
  isPlaying: boolean;
  track: SpotifyTrack | null;
}

export default function AboutTimeAndMusic() {
  const [parisHours, setParisHours] = useState(0);
  const [parisMinutes, setParisMinutes] = useState(0);
  const [parisSeconds, setParisSeconds] = useState(0);
  const [spotifyData, setSpotifyData] = useState<SpotifyData | null>(null);

  useEffect(() => {
    const updateTime = () => {
      const parisDate = getTimeInTimezone("Europe/Paris");
      setParisHours(parisDate.getHours());
      setParisMinutes(parisDate.getMinutes());
      setParisSeconds(parisDate.getSeconds());
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchNowPlaying = async () => {
      try {
        const response = await fetch("/api/spotify/now-playing");
        if (response.ok) {
          const result = await response.json();
          setSpotifyData(result);
        }
      } catch (err) {
        console.error("Error fetching Spotify data:", err);
      }
    };

    fetchNowPlaying();
    // Poll every 15 seconds
    const interval = setInterval(fetchNowPlaying, 30_000);

    return () => clearInterval(interval);
  }, []);

  const trackName = spotifyData?.track
    ? `${spotifyData.track.title} by ${spotifyData.track.artist}`
    : null;

  return (
    <p className="text-3xl md:text-4xl lg:text-5xl font-normal text-foreground leading-[1.2] max-w-4xl pt-6">
      It is{" "}
      <span className="font-mono inline-flex items-baseline gap-0.5">
        <NumberFlow value={parisHours} format={{ minimumIntegerDigits: 2 }} />
        <span>:</span>
        <NumberFlow value={parisMinutes} format={{ minimumIntegerDigits: 2 }} />
        <span>:</span>
        <NumberFlow value={parisSeconds} format={{ minimumIntegerDigits: 2 }} />
      </span>{" "}
      in Paris right now.
    </p>
  );
}
