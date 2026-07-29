"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import NumberFlow from "@number-flow/react";
import { useHeartRate } from "@/lib/heartRateContext";
import ContributionGraph, {
  getContributionGraphSize,
} from "@/components/widgets/ContributionGraph";
import WeatherIcon from "@/components/widgets/WeatherIcon";
import {
  StreamingWords,
  assignFreshWordDelays,
  pushTextWords,
  splitWords,
  type StreamingWord,
} from "@/components/StreamingWords";
import type { ContributionCalendarWeek } from "@/lib/github";
import { getWeatherCondition } from "@/lib/weather";
import {
  readLastSpotifyTrack,
  writeLastSpotifyTrack,
} from "@/lib/spotify-last-track";

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

type HoverPreview = "track" | "commits" | "weather" | null;

type TitleSegment =
  | {
      key: string;
      type: "link";
      href: string;
      words: StreamingWord[];
    }
  | {
      key: string;
      type: "hover";
      preview: Exclude<HoverPreview, null>;
      words: StreamingWord[];
    }
  | {
      key: string;
      type: "words";
      words: StreamingWord[];
    };

const TRACK_POPUP_SIZE = 120;
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
  const [parisTemperature, setParisTemperature] = useState<number | null>(null);
  const [parisWeatherCode, setParisWeatherCode] = useState<number | null>(null);
  const [spotifyData, setSpotifyData] = useState<SpotifyData | null>(null);
  const [spotifyResolved, setSpotifyResolved] = useState(false);
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
  const parisLinkRef = useRef<HTMLSpanElement>(null);
  const spotifyInitialFetchDoneRef = useRef(false);
  const animatedWordKeysRef = useRef(new Set<string>());
  const artwork = spotifyData?.track?.artwork ?? "";
  const showTrackPreview = hoverPreview === "track" && Boolean(artwork) && cursorPosition.y > 0;
  const showCommitsPreview =
    hoverPreview === "commits" && contributionWeeks !== null && cursorPosition.y > 0;
  const showWeatherPreview =
    hoverPreview === "weather" && parisTemperature !== null && cursorPosition.y > 0;
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

  // Fetch Paris weather
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const response = await fetch("/api/weather/paris");
        if (!response.ok) return;
        const result = (await response.json()) as {
          celsius?: number;
          weatherCode?: number;
        };
        if (typeof result.celsius === "number") {
          setParisTemperature(result.celsius);
        }
        if (typeof result.weatherCode === "number") {
          setParisWeatherCode(result.weatherCode);
        }
      } catch (error) {
        console.error("Failed to fetch Paris weather:", error);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);
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

  // Fetch Spotify now playing (falls back to last stored track)
  useEffect(() => {
    const cachedTrack = readLastSpotifyTrack();
    if (cachedTrack) {
      setSpotifyData({ isPlaying: false, track: cachedTrack });
      setSpotifyResolved(true);
    }

    const resolveSpotifyData = (result: SpotifyData): SpotifyData | null => {
      if (result.track) {
        writeLastSpotifyTrack(result.track);
        return result;
      }

      const stored = readLastSpotifyTrack() ?? cachedTrack;
      if (stored) {
        return { isPlaying: false, track: stored };
      }

      return null;
    };

    const fetchNowPlaying = async () => {
      try {
        const response = await fetch("/api/spotify/now-playing", {
          cache: "no-store",
        });
        if (response.ok) {
          const result = (await response.json()) as SpotifyData;
          setSpotifyData(resolveSpotifyData(result));
        }
      } catch (error) {
        console.error("Failed to fetch Spotify data:", error);
      } finally {
        if (!spotifyInitialFetchDoneRef.current) {
          spotifyInitialFetchDoneRef.current = true;
          setSpotifyResolved(true);
        }
      }
    };

    fetchNowPlaying();
    const interval = setInterval(fetchNowPlaying, 10_000);
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
      const activeTarget =
        touchArmedPreview === "track"
          ? trackLinkRef.current
          : touchArmedPreview === "commits"
            ? commitsLinkRef.current
            : touchArmedPreview === "weather"
              ? parisLinkRef.current
              : null;
      if (activeTarget && target && activeTarget.contains(target)) return;

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

  /** Mobile only: first tap = preview; links navigate on second tap. */
  const handlePreviewClick = (
    e: React.MouseEvent<HTMLElement>,
    preview: Exclude<HoverPreview, null>
  ) => {
    if (!isMobileViewport()) return;

    if (touchArmedPreview !== preview) {
      e.preventDefault();
      setTouchArmedPreview(preview);
      setHoverPreview(preview);
      setCursorPosition({ x: e.clientX, y: e.clientY });
      return;
    }

    setTouchArmedPreview(null);
    setHoverPreview(null);
    if (preview === "weather") {
      e.preventDefault();
    }
  };

  const titleSegments = useMemo((): TitleSegment[] => {
    const segments: TitleSegment[] = [];
    const delayIndex = { current: 0 };

    const nameWords: StreamingWord[] = [];
    pushTextWords(nameWords, "name", "Ilya Komolkin", delayIndex);
    segments.push({
      key: "name",
      type: "link",
      href: "https://x.com/dappdesigner",
      words: nameWords,
    });

    const showSecondLine =
      spotifyResolved && Boolean(spotifyData?.track || yearCommits !== null);
    if (!showSecondLine) return segments;

    segments.push({
      key: "line-break",
      type: "words",
      words: [{ key: "line-break", delayIndex: delayIndex.current++, content: <br /> }],
    });

    if (spotifyData?.track) {
      const listeningLabel = spotifyData.isPlaying
        ? "is listening to"
        : "listened to";
      const prefixWords: StreamingWord[] = [];
      pushTextWords(
        prefixWords,
        `spotify-prefix-${spotifyData.isPlaying ? "playing" : "paused"}`,
        listeningLabel,
        delayIndex,
        (word) => (
          <span className="opacity-40">
            {word}{" "}
          </span>
        )
      );
      segments.push({
        key: `spotify-prefix-${spotifyData.isPlaying ? "playing" : "paused"}`,
        type: "words",
        words: prefixWords,
      });

      const trackId = spotifyData.track.url || `${spotifyData.track.title}-${spotifyData.track.artist}`;
      const trackWords: StreamingWord[] = [];
      const trackText = `${spotifyData.track.title} – ${spotifyData.track.artist}`;
      splitWords(trackText).forEach((word, i, arr) => {
        trackWords.push({
          key: `track-${trackId}-${i}`,
          delayIndex: delayIndex.current++,
          content: i === arr.length - 1 ? word : <>{word}{" "}</>,
        });
      });
      segments.push({
        key: `track-${trackId}`,
        type: "link",
        href: spotifyData.track.url,
        words: trackWords,
      });

      if (yearCommits !== null) {
        segments.push({
          key: "track-comma",
          type: "words",
          words: [
            {
              key: "track-comma",
              delayIndex: delayIndex.current++,
              content: <span className="opacity-40">, </span>,
            },
          ],
        });
      }
    }

    if (yearCommits !== null) {
      const pushedWords: StreamingWord[] = [];
      pushTextWords(pushedWords, "commits-prefix", "pushed", delayIndex, (word) => (
        <span className="opacity-40">
          {word}{" "}
        </span>
      ));
      segments.push({ key: "commits-prefix", type: "words", words: pushedWords });

      const commitsLinkWords: StreamingWord[] = [
        {
          key: "commits-count",
          delayIndex: delayIndex.current++,
          content: (
            <span className="whitespace-nowrap">
              <span className="inline-flex items-baseline font-mono">
                <NumberFlow
                  value={yearCommits}
                  style={{ ["--number-flow-mask-height" as string]: "0em" }}
                />
              </span>{" "}
              commits{" "}
            </span>
          ),
        },
      ];
      segments.push({
        key: "commits-link",
        type: "link",
        href: "https://github.com/komolkin",
        words: commitsLinkWords,
      });

      const tailWords: StreamingWord[] = [];
      tailWords.push({
        key: "commits-tail",
        delayIndex: delayIndex.current++,
        content: <span className="opacity-40">this year</span>,
      });
      pushTextWords(tailWords, "commits-hr", ", his HR is", delayIndex, (word) => (
        <span className="opacity-40">
          {word}{" "}
        </span>
      ));
      tailWords.push({
        key: "commits-bpm",
        delayIndex: delayIndex.current++,
        content: (
          <span className="whitespace-nowrap">
            <span className="font-mono">
              <NumberFlow
                value={bpm}
                style={{ ["--number-flow-mask-height" as string]: "0em" }}
              />
            </span>{" "}
            BPM{" "}
          </span>
        ),
      });
      pushTextWords(tailWords, "commits-and", "and it's", delayIndex, (word) => (
        <span className="opacity-40">
          {word}{" "}
        </span>
      ));
      tailWords.push({
        key: "commits-time",
        delayIndex: delayIndex.current++,
        content: (
          <>
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
          </>
        ),
      });
      pushTextWords(tailWords, "commits-now-in", "now in", delayIndex, (word) => (
        <span className="opacity-40">
          {word}{" "}
        </span>
      ));
      segments.push({ key: "commits-tail", type: "words", words: tailWords });

      segments.push({
        key: "paris-weather",
        type: "hover",
        preview: "weather",
        words: [
          {
            key: "paris",
            delayIndex: delayIndex.current++,
            content: (
              <span className="whitespace-nowrap">Paris.</span>
            ),
          },
        ],
      });
    }

    return segments;
  }, [spotifyData, spotifyResolved, yearCommits, bpm, parisHours, parisMinutes]);

  const animatedTitleSegments = assignFreshWordDelays(
    titleSegments,
    animatedWordKeysRef
  );

  return (
    <div id="top" className="slide w-full h-[100dvh] md:h-screen relative flex flex-col">
      {/* Hover Preview Popup */}
      {showTrackPreview && artwork ? (
        <div
          className="pointer-events-none fixed z-[100] flex-shrink-0"
          style={{
            width: previewWidth,
            height: previewHeight,
            left: cursorPosition.x,
            top: Math.max(16, cursorPosition.y - previewHeight - 16),
            transform: "translateX(-50%)",
          }}
          aria-hidden={!showTrackPreview}
        >
          <img
            src={artwork}
            alt={
              spotifyData?.track ? `${spotifyData.track.title} album cover` : "Spotify album cover"
            }
            className="h-full w-full object-cover rounded-lg shadow-2xl"
            style={{
              minWidth: TRACK_POPUP_SIZE,
              minHeight: TRACK_POPUP_SIZE,
            }}
          />
        </div>
      ) : null}

      {/*
        Keep backdrop-blur at full opacity — fading opacity on a blurred layer
        makes the browser recompute the blur each frame (stepped / laggy).
      */}
      {contributionWeeks ? (
        <div
          className={`pointer-events-none fixed z-[100] flex-shrink-0 ${
            showCommitsPreview ? "visible" : "invisible"
          }`}
          style={{
            left: cursorPosition.x,
            top: Math.max(16, cursorPosition.y - previewHeight - 16),
            transform: "translateX(-50%)",
          }}
          aria-hidden={!showCommitsPreview}
        >
          <div className="inline-flex rounded-lg bg-white/10 p-[10px] shadow-2xl backdrop-blur-md">
            <ContributionGraph weeks={contributionWeeks} />
          </div>
        </div>
      ) : null}

      <div
        className={`pointer-events-none fixed z-[100] flex-shrink-0 ${
          showWeatherPreview ? "visible" : "invisible"
        }`}
        style={{
          width: TRACK_POPUP_SIZE,
          height: TRACK_POPUP_SIZE,
          left: cursorPosition.x,
          top: Math.max(16, cursorPosition.y - TRACK_POPUP_SIZE - 16),
          transform: "translateX(-50%)",
        }}
        aria-hidden={!showWeatherPreview}
      >
        <div className="flex size-full flex-col justify-between rounded-lg bg-white/10 p-[10px] shadow-2xl backdrop-blur-md">
          {parisWeatherCode !== null ? (
            <WeatherIcon
              condition={getWeatherCondition(parisWeatherCode)}
              className="size-10 text-white"
            />
          ) : (
            <span aria-hidden="true" />
          )}
          <span className="font-mono text-3xl tabular-nums text-foreground leading-none">
            {parisTemperature}°C
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center px-6 md:px-8 lg:px-10">
        <h1 className="text-pretty text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-normal text-foreground leading-[1.15] max-w-2xl xl:max-w-4xl">
          {animatedTitleSegments.map((segment) => {
            if (segment.type === "hover") {
              return (
                <span
                  key={segment.key}
                  ref={segment.preview === "weather" ? parisLinkRef : undefined}
                  role="presentation"
                  className="hover:text-muted-foreground transition-colors cursor-pointer"
                  onMouseEnter={() => {
                    if (!isMobileViewport()) setHoverPreview(segment.preview);
                  }}
                  onMouseLeave={clearHoverPreview}
                  onMouseMove={handleMouseMove}
                  onClick={(e) => handlePreviewClick(e, segment.preview)}
                >
                  <StreamingWords
                    words={segment.words}
                    animatedWordKeysRef={animatedWordKeysRef}
                  />
                </span>
              );
            }

            if (segment.type === "link") {
              const isTrackLink = segment.key.startsWith("track-");
              const isCommitsLink = segment.key === "commits-link";

              return (
                <a
                  key={segment.key}
                  href={segment.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  ref={isTrackLink ? trackLinkRef : isCommitsLink ? commitsLinkRef : undefined}
                  className="hover:text-muted-foreground transition-colors"
                  onMouseEnter={
                    isTrackLink || isCommitsLink
                      ? () => {
                          if (!isMobileViewport()) {
                            setHoverPreview(isTrackLink ? "track" : "commits");
                          }
                        }
                      : undefined
                  }
                  onMouseLeave={isTrackLink || isCommitsLink ? clearHoverPreview : undefined}
                  onMouseMove={isTrackLink || isCommitsLink ? handleMouseMove : undefined}
                  onClick={
                    isTrackLink
                      ? (e) => handlePreviewClick(e, "track")
                      : isCommitsLink
                        ? (e) => handlePreviewClick(e, "commits")
                        : undefined
                  }
                >
                  <StreamingWords
                    words={segment.words}
                    animatedWordKeysRef={animatedWordKeysRef}
                  />
                </a>
              );
            }

            return (
              <StreamingWords
                key={segment.key}
                words={segment.words}
                animatedWordKeysRef={animatedWordKeysRef}
              />
            );
          })}
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
