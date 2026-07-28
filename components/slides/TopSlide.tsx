"use client";

import { useEffect, useRef, useState } from "react";
import NumberFlow from "@number-flow/react";
import { useHeartRate } from "@/lib/heartRateContext";
import ContributionGraph, {
  getContributionGraphSize,
} from "@/components/widgets/ContributionGraph";
import type { ContributionCalendarWeek } from "@/lib/github";

interface SpotifyTrack {
  title: string;
  artist: string;
  url: string;
  artwork: string;
}

interface SpotifyData {
  isPlaying: boolean;
  track: SpotifyTrack | null;
  playedAt?: string;
}

type HoverPreview = "track" | "commits" | null;

const TRACK_POPUP_SIZE = 240;
const COMMITS_GRAPH_PADDING = 10;

function getCommitsPopupSize(weekCount: number) {
  const graph = getContributionGraphSize(weekCount);

  return {
    width: graph.width + COMMITS_GRAPH_PADDING * 2,
    height: graph.height + COMMITS_GRAPH_PADDING * 2,
  };
}

function getTimeInTimezone(timezone: string): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: timezone }));
}

/** Mobile viewport only (below Tailwind `md`). Desktop keeps hover + single click. */
function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

export default function TopSlide() {
  const { bpm } = useHeartRate();
  const [parisHours, setParisHours] = useState(0);
  const [parisMinutes, setParisMinutes] = useState(0);
  const [spotifyData, setSpotifyData] = useState<SpotifyData | null>(null);
  const [yearCommits, setYearCommits] = useState<number | null>(null);
  const [contributionWeeks, setContributionWeeks] = useState<ContributionCalendarWeek[] | null>(
    null
  );
  const [hoverPreview, setHoverPreview] = useState<HoverPreview>(null);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  /** Mobile only: which preview link is armed for a second-tap navigation. */
  const [touchArmedPreview, setTouchArmedPreview] = useState<HoverPreview>(null);
  const trackLinkRef = useRef<HTMLAnchorElement>(null);
  const commitsLinkRef = useRef<HTMLAnchorElement>(null);
  const artwork = spotifyData?.track?.artwork ?? "";
  const showTrackPreview = hoverPreview === "track" && Boolean(artwork) && cursorPosition.y > 0;
  const showCommitsPreview =
    hoverPreview === "commits" && contributionWeeks !== null && cursorPosition.y > 0;
  const showPreview = showTrackPreview || showCommitsPreview;
  const commitsPopupSize = contributionWeeks
    ? getCommitsPopupSize(contributionWeeks.length)
    : { width: 0, height: 0 };
  const previewWidth = showCommitsPreview ? commitsPopupSize.width : TRACK_POPUP_SIZE;
  const previewHeight = showCommitsPreview ? commitsPopupSize.height : TRACK_POPUP_SIZE;

  // Update Paris time every second
  useEffect(() => {
    const updateTime = () => {
      const parisDate = getTimeInTimezone("Europe/Paris");
      setParisHours(parisDate.getHours());
      setParisMinutes(parisDate.getMinutes());
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

  // Fetch Spotify now playing (falls back to recently played on the server)
  useEffect(() => {
    const lastLiveTrackRef: {
      current: { track: SpotifyTrack; seenAt: number } | null;
    } = { current: null };

    // Drop stale browser cache from an earlier implementation
    try {
      localStorage.removeItem("spotify-last-track");
    } catch {
      // ignore private mode
    }

    const resolveSpotifyData = (result: SpotifyData): SpotifyData | null => {
      if (result.isPlaying && result.track) {
        lastLiveTrackRef.current = { track: result.track, seenAt: Date.now() };
        return result;
      }

      if (result.track) {
        const live = lastLiveTrackRef.current;
        if (live) {
          const recentPlayedAt = result.playedAt
            ? Date.parse(result.playedAt)
            : 0;
          // Spotify's recently-played endpoint is often stale; prefer a track
          // we saw live in this session when the API timestamp is older.
          if (
            !result.playedAt ||
            Number.isNaN(recentPlayedAt) ||
            recentPlayedAt < live.seenAt - 60_000
          ) {
            return { isPlaying: false, track: live.track };
          }
        }
        return result;
      }

      const live = lastLiveTrackRef.current;
      if (live && Date.now() - live.seenAt < 30 * 60_000) {
        return { isPlaying: false, track: live.track };
      }

      return null;
    };

    const fetchNowPlaying = async () => {
      try {
        const response = await fetch("/api/spotify/now-playing", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const result = (await response.json()) as SpotifyData;
        setSpotifyData(resolveSpotifyData(result));
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

  // Fetch GitHub contribution graph for hover preview
  useEffect(() => {
    const fetchContributions = async () => {
      try {
        const response = await fetch("/api/github/contributions");
        if (!response.ok) return;
        const result = await response.json();
        if (Array.isArray(result.weeks)) {
          setContributionWeeks(result.weeks);
        }
      } catch (error) {
        console.error("Failed to fetch GitHub contributions:", error);
      }
    };

    fetchContributions();
    const interval = setInterval(fetchContributions, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Mobile only: dismiss armed preview when tapping outside the active link
  useEffect(() => {
    if (!touchArmedPreview) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!isMobileViewport()) return;

      const target = event.target as Node | null;
      const activeLink =
        touchArmedPreview === "track" ? trackLinkRef.current : commitsLinkRef.current;
      if (activeLink && target && activeLink.contains(target)) return;

      setTouchArmedPreview(null);
      setHoverPreview(null);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [touchArmedPreview]);

  const handleMouseMove = (e: React.MouseEvent) => {
    setCursorPosition({ x: e.clientX, y: e.clientY });
  };

  const clearHoverPreview = () => {
    // Don't clear an armed mobile preview via mouseleave
    if (isMobileViewport() && touchArmedPreview) return;
    setHoverPreview(null);
  };

  /** Mobile only: first tap = preview, second tap = follow link. Desktop: no-op. */
  const handlePreviewClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    preview: "track" | "commits"
  ) => {
    if (!isMobileViewport()) return;

    if (touchArmedPreview !== preview) {
      e.preventDefault();
      setTouchArmedPreview(preview);
      setHoverPreview(preview);
      setCursorPosition({ x: e.clientX, y: e.clientY });
      return;
    }

    // Second tap: follow the link and clear the preview
    setTouchArmedPreview(null);
    setHoverPreview(null);
  };

  return (
    <div id="top" className="slide w-full h-[100dvh] md:h-screen relative flex flex-col">
      {/* Hover Preview Popup */}
      <div
        className={`fixed z-[100] flex-shrink-0 transition-opacity duration-150 ${
          showPreview ? "pointer-events-none opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{
          ...(showTrackPreview
            ? { width: previewWidth, height: previewHeight }
            : undefined),
          left: cursorPosition.x,
          top: Math.max(16, cursorPosition.y - previewHeight - 16),
          transform: "translateX(-50%)",
        }}
        aria-hidden={!showPreview}
      >
        {showTrackPreview && artwork ? (
          <img
            src={artwork}
            alt={
              spotifyData?.track ? `${spotifyData.track.title} album cover` : "Spotify album cover"
            }
            className="h-full w-full min-h-[240px] min-w-[240px] object-cover rounded-lg shadow-2xl"
          />
        ) : null}
        {showCommitsPreview && contributionWeeks ? (
          <div className="inline-flex rounded-lg bg-white/10 p-[10px] shadow-2xl backdrop-blur-md">
            <ContributionGraph weeks={contributionWeeks} />
          </div>
        ) : null}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center px-6 md:px-8 lg:px-10">
        <h1 className="text-balance text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-normal text-foreground leading-[1.15] max-w-2xl xl:max-w-4xl">
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
                    ref={trackLinkRef}
                    href={spotifyData.track.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-muted-foreground transition-colors"
                    onMouseEnter={() => {
                      if (!isMobileViewport()) setHoverPreview("track");
                    }}
                    onMouseLeave={clearHoverPreview}
                    onMouseMove={handleMouseMove}
                    onClick={(e) => handlePreviewClick(e, "track")}
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
                    ref={commitsLinkRef}
                    href="https://github.com/komolkin"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-muted-foreground transition-colors"
                    onMouseEnter={() => {
                      if (!isMobileViewport()) setHoverPreview("commits");
                    }}
                    onMouseLeave={clearHoverPreview}
                    onMouseMove={handleMouseMove}
                    onClick={(e) => handlePreviewClick(e, "commits")}
                  >
                    <span className="inline-flex items-baseline font-mono">
                      <NumberFlow
                        value={yearCommits}
                        style={{ ["--number-flow-mask-height" as string]: "0em" }}
                      />
                    </span>{" "}
                    commits
                  </a>{" "}
                  <span className="opacity-40">this year</span>
                  <span className="opacity-40">, his HR is</span>{" "}
                  <span className="whitespace-nowrap">
                    <span className="font-mono">
                      <NumberFlow
                        value={bpm}
                        style={{ ["--number-flow-mask-height" as string]: "0em" }}
                      />
                    </span>{" "}
                    BPM
                  </span>{" "}
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
                  <span className="opacity-40">now in Paris.</span>
                </>
              ) : null}
            </>
          ) : null}
        </h1>
      </div>

      {/* Bottom Info Bar */}
      <div className="shrink-0 px-6 md:px-8 lg:px-10 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:pb-8 lg:pb-10">
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
  );
}
