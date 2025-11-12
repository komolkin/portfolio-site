"use client";

import { useEffect, useState, useRef } from "react";

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

// Scrolling text component for long text
function ScrollingText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const textWidth = textRef.current.scrollWidth;
        setShouldScroll(textWidth > containerWidth);
      }
    };

    checkOverflow();
    // Recheck on window resize
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [text]);

  return (
    <div
      ref={containerRef}
      className="overflow-hidden relative w-full pointer-events-none"
    >
      <div
        ref={textRef}
        className={`whitespace-nowrap pointer-events-auto ${
          shouldScroll ? "animate-scroll-text" : ""
        } ${className || ""}`}
      >
        {shouldScroll ? (
          <>
            <span>{text}</span>
            <span className="ml-8">{text}</span>
          </>
        ) : (
          text
        )}
      </div>
    </div>
  );
}

export default function SpotifyWidget() {
  const [data, setData] = useState<SpotifyData | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchNowPlaying = async (isInitial = false) => {
    try {
      if (isInitial) {
        setIsInitialLoading(true);
      }
      setError(false);
      const response = await fetch("/api/spotify/now-playing");

      if (!response.ok) {
        throw new Error("Failed to fetch");
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(true);
      console.error("Error fetching Spotify data:", err);
    } finally {
      if (isInitial) {
        setIsInitialLoading(false);
      }
    }
  };

  useEffect(() => {
    // Initial load with loading state
    fetchNowPlaying(true);

    // Poll every 15 seconds without showing loading state
    const interval = setInterval(() => fetchNowPlaying(false), 15000);

    return () => clearInterval(interval);
  }, []);

  if (isInitialLoading) {
    return (
      <div className="p-4 flex items-center gap-3 w-[280px]">
        <div className="w-16 h-16 bg-muted rounded-[4px] flex-shrink-0 animate-pulse" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-4 bg-muted rounded animate-pulse" />
          <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !data?.track) {
    return (
      <div className="p-4 flex items-center gap-3 w-[280px]">
        <div className="w-16 h-16 bg-muted rounded-[4px] flex-shrink-0 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-muted-foreground"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-xs truncate leading-[1.4]">
            Not playing
          </div>
          <div className="text-xs text-muted-foreground truncate leading-[1.4]">
            No track data
          </div>
        </div>
      </div>
    );
  }

  const { track, isPlaying } = data;
  const fullText = `${track.title} - ${track.artist}`;

  return (
    <div
      className="p-4 flex items-center gap-3 w-[280px]"
      key={`${track.title}-${track.artist}`}
    >
      {track.artwork ? (
        <img
          src={track.artwork}
          alt={`${track.title} by ${track.artist}`}
          className="w-16 h-16 rounded-[4px] flex-shrink-0 object-cover transition-opacity duration-300 pointer-events-none"
          key={track.artwork}
          draggable="false"
        />
      ) : (
        <div className="w-16 h-16 bg-muted rounded-[4px] flex-shrink-0 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-muted-foreground"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>
        </div>
      )}
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="font-medium text-xs mb-1 transition-opacity duration-300 leading-[1.4] text-muted-foreground">
          {isPlaying ? "Now playing" : "Recently played"}
        </div>
        <a
          href={track.url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:opacity-80 transition-opacity inline-block w-full"
          onClick={(e) => {
            e.stopPropagation();
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
        >
          <ScrollingText
            text={fullText}
            className="text-xs text-white leading-[1.4]"
          />
        </a>
      </div>
    </div>
  );
}
