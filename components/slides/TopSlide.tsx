"use client";

import { useEffect, useState, useRef } from "react";
import NumberFlow from "@number-flow/react";
import { useHeartRate } from "@/lib/heartRateContext";

interface SpotifyTrack {
  title: string;
  artist: string;
  url: string;
  artwork: string;
}

interface SpotifyData {
  isPlaying: boolean;
  track: SpotifyTrack | null;
}

function getTimeInTimezone(timezone: string): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: timezone }));
}

export default function TopSlide() {
  const { bpm } = useHeartRate();
  const [parisHours, setParisHours] = useState(0);
  const [parisMinutes, setParisMinutes] = useState(0);
  const [parisSeconds, setParisSeconds] = useState(0);
  const [spotifyData, setSpotifyData] = useState<SpotifyData | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const songLinkRef = useRef<HTMLAnchorElement>(null);

  // Update Paris time every second
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

  // Fetch Spotify now playing
  useEffect(() => {
    const fetchNowPlaying = async () => {
      try {
        const response = await fetch("/api/spotify/now-playing");
        if (response.ok) {
          const result = await response.json();
          setSpotifyData(result);
        }
      } catch (error) {
        console.error("Failed to fetch Spotify data:", error);
      }
    };

    fetchNowPlaying();
    const interval = setInterval(fetchNowPlaying, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    setCursorPosition({ x: e.clientX, y: e.clientY });
  };

  return (
    <div id="top" className="slide w-full h-screen relative flex flex-col">
      {/* Album Cover Popup */}
      {isHovering && spotifyData?.track?.artwork && cursorPosition.y > 0 && (
        <div
          className="fixed pointer-events-none z-[100] w-[240px] h-[240px] flex-shrink-0"
          style={{
            left: cursorPosition.x,
            top: Math.max(16, cursorPosition.y - 240 - 16),
            transform: "translateX(-50%)",
          }}
        >
          <img
            src={spotifyData.track.artwork}
            alt={`${spotifyData.track.title} album cover`}
            className="w-[240px] h-[240px] min-w-[240px] min-h-[240px] object-cover rounded-lg shadow-2xl"
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex items-center px-6 md:px-8 lg:px-10">
        <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-normal text-foreground leading-[1.2] max-w-2xl xl:max-w-4xl">
          Ilya Komolkin
        </h1>
      </div>

      {/* Bottom Info Bar */}
      <div className="px-6 md:px-8 lg:px-10 pb-6 md:pb-8 lg:pb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
          {/* Location */}
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Location</div>
            <div className="text-sm text-foreground flex items-center gap-1">
              <span>Paris,</span>
              <span className="font-mono flex items-center">
                <NumberFlow
                  value={parisHours}
                  format={{ minimumIntegerDigits: 2 }}
                />
                <span>:</span>
                <NumberFlow
                  value={parisMinutes}
                  format={{ minimumIntegerDigits: 2 }}
                />
                <span>:</span>
                <NumberFlow
                  value={parisSeconds}
                  format={{ minimumIntegerDigits: 2 }}
                />
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Quick Links</div>
            <div className="text-sm text-foreground">
              <a
                href="https://x.com/dappdesigner"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-muted-foreground transition-colors"
              >
                X
              </a>
              ,{" "}
              <a
                href="https://www.instagram.com/komolkin/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-muted-foreground transition-colors"
              >
                Instagram
              </a>
              ,{" "}
              <a
                href="https://github.com/komolkin"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-muted-foreground transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>

          {/* Heart Rate */}
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Heart Rate</div>
            <div className="text-sm text-foreground font-mono">
              <NumberFlow value={bpm} suffix=" BPM" />
            </div>
          </div>

          {/* Recently Played */}
          <div
            className="space-y-1 cursor-pointer"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onMouseMove={handleMouseMove}
          >
            <div className="text-sm text-muted-foreground">
              {spotifyData?.isPlaying ? "Now playing" : "Recently played"}
            </div>
            <div className="text-sm text-foreground">
              {spotifyData?.track ? (
                <a
                  ref={songLinkRef}
                  href={spotifyData.track.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-muted-foreground transition-colors"
                >
                  {spotifyData.track.title} – {spotifyData.track.artist}
                </a>
              ) : (
                "–"
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
