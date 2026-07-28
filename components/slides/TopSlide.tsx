"use client";

import { useEffect, useState } from "react";
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
  const [yearCommits, setYearCommits] = useState<number | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const artwork = spotifyData?.track?.artwork ?? "";

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

  useEffect(() => {
    if (!artwork) return;
    const img = new window.Image();
    img.src = artwork;
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [artwork]);

  // Fetch Spotify now playing (falls back to recently played; keep last known track)
  useEffect(() => {
    const storageKey = "spotify-last-track";

    try {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        const parsed = JSON.parse(cached) as SpotifyData;
        if (parsed?.track) setSpotifyData(parsed);
      }
    } catch {
      // ignore invalid cache
    }

    const fetchNowPlaying = async () => {
      try {
        const response = await fetch("/api/spotify/now-playing");
        if (!response.ok) return;
        const result = (await response.json()) as SpotifyData;

        setSpotifyData((prev) => {
          const next: SpotifyData = result.track
            ? result
            : prev?.track
              ? { isPlaying: false, track: prev.track }
              : result;

          if (next.track) {
            try {
              localStorage.setItem(
                storageKey,
                JSON.stringify({ isPlaying: false, track: next.track })
              );
            } catch {
              // ignore quota / private mode
            }
          }

          return next;
        });
      } catch (error) {
        console.error("Failed to fetch Spotify data:", error);
      }
    };

    fetchNowPlaying();
    const interval = setInterval(fetchNowPlaying, 15000);
    return () => clearInterval(interval);
  }, []);

  // Fetch GitHub commits for the current year
  useEffect(() => {
    const fetchCommits = async () => {
      try {
        const response = await fetch("/api/github/commits");
        if (response.ok) {
          const result = await response.json();
          if (typeof result.commits === "number") {
            setYearCommits(result.commits);
          }
        }
      } catch (error) {
        console.error("Failed to fetch GitHub commits:", error);
      }
    };

    fetchCommits();
    const interval = setInterval(fetchCommits, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    setCursorPosition({ x: e.clientX, y: e.clientY });
  };

  return (
    <div id="top" className="slide w-full h-[100dvh] md:h-screen relative flex flex-col">
      {/* Album Cover Popup */}
      <div
        className={`fixed z-[100] w-[240px] h-[240px] flex-shrink-0 transition-opacity duration-150 ${
          isHovering && Boolean(artwork) && cursorPosition.y > 0
            ? "pointer-events-none opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        style={{
          left: cursorPosition.x,
          top: Math.max(16, cursorPosition.y - 240 - 16),
          transform: "translateX(-50%)",
        }}
        aria-hidden={!isHovering || !artwork}
      >
        {artwork && (
          <img
            src={artwork}
            alt={
              spotifyData?.track ? `${spotifyData.track.title} album cover` : "Spotify album cover"
            }
            className="w-[240px] h-[240px] min-w-[240px] min-h-[240px] object-cover rounded-lg shadow-2xl"
          />
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center px-6 md:px-8 lg:px-10">
        <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-normal text-foreground leading-[1.15] max-w-2xl xl:max-w-4xl">
          <a
            href="https://x.com/dappdesigner"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-muted-foreground transition-colors"
          >
            Ilya Komolkin
          </a>
          {spotifyData?.track || yearCommits !== null ? (
            <>
              <br />
              {spotifyData?.track ? (
                <>
                  <span className="opacity-40">
                    {spotifyData.isPlaying ? "is listening to" : "listened to"}
                  </span>{" "}
                  <a
                    href={spotifyData.track.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-muted-foreground transition-colors"
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                    onMouseMove={handleMouseMove}
                  >
                    {spotifyData.track.title} – {spotifyData.track.artist}
                  </a>
                  {yearCommits !== null ? (
                    <span className="opacity-40">,</span>
                  ) : null}
                </>
              ) : null}
              {spotifyData?.track && yearCommits !== null ? " " : null}
              {yearCommits !== null ? (
                <>
                  <span className="opacity-40">pushed</span>{" "}
                  <a
                    href="https://github.com/komolkin"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-muted-foreground transition-colors"
                  >
                    <NumberFlow
                      value={yearCommits}
                      style={{ ["--number-flow-mask-height" as string]: "0em" }}
                    />{" "}
                    commits
                  </a>{" "}
                  <span className="opacity-40">this year</span>
                  <span className="opacity-40">, his HR is</span>{" "}
                  <span className="inline-flex items-baseline font-mono">
                    <NumberFlow
                      value={bpm}
                      style={{ ["--number-flow-mask-height" as string]: "0em" }}
                    />
                  </span>{" "}
                  BPM{" "}
                  <span className="opacity-40">and it&apos;s</span>{" "}
                  <span className="inline-flex items-baseline font-mono">
                    <NumberFlow
                      value={parisHours}
                      format={{ minimumIntegerDigits: 2 }}
                      style={{ ["--number-flow-mask-height" as string]: "0em" }}
                    />
                    <span>:</span>
                    <NumberFlow
                      value={parisMinutes}
                      format={{ minimumIntegerDigits: 2 }}
                      style={{ ["--number-flow-mask-height" as string]: "0em" }}
                    />
                  </span>{" "}
                  <span className="opacity-40">now.</span>
                </>
              ) : null}
            </>
          ) : null}
        </h1>
      </div>

      {/* Bottom Info Bar */}
      <div className="shrink-0 px-6 md:px-8 lg:px-10 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:pb-8 lg:pb-10">
        <div className="grid grid-cols-2 gap-8 md:gap-4">
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
        </div>
      </div>
    </div>
  );
}
