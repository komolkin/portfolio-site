"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import NumberFlow from "@number-flow/react";
import { useHeartRate } from "@/lib/heartRateContext";
import ContributionGraph, {
  getContributionGraphSize,
} from "@/components/widgets/ContributionGraph";
import WeatherIcon from "@/components/widgets/WeatherIcon";
import AnalogueClock from "@/components/widgets/AnalogueClock";
import HoverGlass from "@/components/widgets/HoverGlass";
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
import { playTick } from "@/lib/sfx";

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

type HoverPreview = "track" | "commits" | "weather" | "time" | null;

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
      type: "emphasis";
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

/** Slightly larger than the glyph box so hover feels easy without spilling into neighbors. */
function findTitleFocusElement(
  root: HTMLElement,
  x: number,
  y: number,
): HTMLElement | null {
  let best: { el: HTMLElement; dist: number } | null = null;

  for (const node of root.querySelectorAll("[data-title-focus]")) {
    if (!(node instanceof HTMLElement)) continue;
    for (const rect of node.getClientRects()) {
      if (rect.width === 0 || rect.height === 0) continue;
      const padY = Math.max(2, rect.height * 0.06);
      const padX = 1;
      if (
        x < rect.left - padX ||
        x > rect.right + padX ||
        y < rect.top - padY ||
        y > rect.bottom + padY
      ) {
        continue;
      }

      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = (x - cx) ** 2 + (y - cy) ** 2;
      if (!best || dist < best.dist) best = { el: node, dist };
    }
  }

  return best?.el ?? null;
}

export default function TopSlide() {
  const { bpm } = useHeartRate();
  const [parisHours, setParisHours] = useState(0);
  const [parisMinutes, setParisMinutes] = useState(0);
  const [clockHands, setClockHands] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
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
  /** Which full-white title link is focused; cleared when leaving that link. */
  const [titleFocusKey, setTitleFocusKey] = useState<string | null>(null);
  /** Mobile only: which preview link is armed for a second-tap navigation. */
  const [touchArmedPreview, setTouchArmedPreview] = useState<HoverPreview>(null);
  const trackLinkRef = useRef<HTMLAnchorElement>(null);
  const commitsLinkRef = useRef<HTMLAnchorElement>(null);
  const timeLinkRef = useRef<HTMLSpanElement>(null);
  const parisLinkRef = useRef<HTMLSpanElement>(null);
  const spotifyInitialFetchDoneRef = useRef(false);
  const animatedWordKeysRef = useRef(new Set<string>());
  const titleFocusKeyRef = useRef<string | null>(null);
  const titleFocusClearRef = useRef<number | null>(null);
  const artwork = spotifyData?.track?.artwork ?? "";
  const showTrackPreview = hoverPreview === "track" && Boolean(artwork) && cursorPosition.y > 0;
  const showCommitsPreview =
    hoverPreview === "commits" && contributionWeeks !== null && cursorPosition.y > 0;
  const showWeatherPreview =
    hoverPreview === "weather" && parisTemperature !== null && cursorPosition.y > 0;
  const showTimePreview = hoverPreview === "time" && cursorPosition.y > 0;
  const commitsPopupSize = contributionWeeks
    ? getCommitsPopupSize(contributionWeeks.length)
    : { width: 0, height: 0 };
  const previewHeight = showCommitsPreview ? commitsPopupSize.height : TRACK_POPUP_SIZE;

  // Update Paris time every second
  useEffect(() => {
    const updateTime = () => {
      const parisDate = getTimeInTimezone("Europe/Paris");
      setParisHours(parisDate.getHours());
      setParisMinutes(parisDate.getMinutes());
      if (!showTimePreview) {
        setClockHands({
          hours: parisDate.getHours(),
          minutes: parisDate.getMinutes(),
          seconds: parisDate.getSeconds(),
        });
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [showTimePreview]);

  // Smooth second hand while the analogue clock preview is open
  useEffect(() => {
    if (!showTimePreview) return;

    let frameId = 0;
    const tick = () => {
      const parisDate = getTimeInTimezone("Europe/Paris");
      setClockHands({
        hours: parisDate.getHours(),
        minutes: parisDate.getMinutes(),
        seconds: parisDate.getSeconds() + parisDate.getMilliseconds() / 1000,
      });
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [showTimePreview]);

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
            : touchArmedPreview === "time"
              ? timeLinkRef.current
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

  const clearHoverPreview = () => {
    // Don't clear an armed mobile preview via mouseleave
    if (isMobileViewport() && touchArmedPreview) return;
    setHoverPreview(null);
  };

  const cancelTitleFocusClear = () => {
    if (titleFocusClearRef.current !== null) {
      window.clearTimeout(titleFocusClearRef.current);
      titleFocusClearRef.current = null;
    }
  };

  const focusTitleLink = (key: string) => {
    cancelTitleFocusClear();
    if (titleFocusKeyRef.current === key) return;
    titleFocusKeyRef.current = key;
    playTick();
    setTitleFocusKey(key);
  };

  /** Clear after leaving a link; short delay only bridges moving into another link. */
  const scheduleTitleFocusClear = () => {
    if (titleFocusKeyRef.current === null) return;
    cancelTitleFocusClear();
    titleFocusClearRef.current = window.setTimeout(() => {
      titleFocusKeyRef.current = null;
      setTitleFocusKey(null);
      titleFocusClearRef.current = null;
      clearHoverPreview();
    }, 40);
  };

  useEffect(() => {
    return () => cancelTitleFocusClear();
  }, []);

  const applyTitleFocusElement = (focusEl: HTMLElement) => {
    const key = focusEl.dataset.titleFocus;
    if (!key) return;

    focusTitleLink(key);

    if (isMobileViewport()) return;

    const preview = focusEl.dataset.titlePreview;
    if (
      preview === "track" ||
      preview === "commits" ||
      preview === "weather" ||
      preview === "time"
    ) {
      setHoverPreview(preview);
    } else {
      clearHoverPreview();
    }
  };

  const handleTitlePointerMove = (e: React.PointerEvent<HTMLHeadingElement>) => {
    const { clientX: x, clientY: y } = e;
    setCursorPosition({ x, y });

    const focusEl = findTitleFocusElement(e.currentTarget, x, y);
    if (focusEl) applyTitleFocusElement(focusEl);
    else scheduleTitleFocusClear();
  };

  const handleTitlePointerLeave = () => {
    scheduleTitleFocusClear();
  };

  const titleLinkOpacity = (key: string) =>
    titleFocusKey !== null && titleFocusKey !== key
      ? "opacity-40"
      : "opacity-100";

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
    if (preview === "weather" || preview === "time") {
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
      pushTextWords(tailWords, "commits-hr", ", the HR is", delayIndex, (word) => (
        <span className="opacity-40">
          {word}{" "}
        </span>
      ));
      segments.push({ key: "commits-tail", type: "words", words: tailWords });

      segments.push({
        key: "commits-bpm",
        type: "emphasis",
        words: [
          {
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
          },
        ],
      });

      const andItsWords: StreamingWord[] = [];
      pushTextWords(andItsWords, "commits-and", "and it's", delayIndex, (word) => (
        <span className="opacity-40">
          {word}{" "}
        </span>
      ));
      segments.push({ key: "commits-and", type: "words", words: andItsWords });

      segments.push({
        key: "paris-time",
        type: "hover",
        preview: "time",
        words: [
          {
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
          },
        ],
      });

      const nowInWords: StreamingWord[] = [];
      pushTextWords(nowInWords, "commits-now-in", "now in", delayIndex, (word) => (
        <span className="opacity-40">
          {word}{" "}
        </span>
      ));
      segments.push({ key: "commits-now-in", type: "words", words: nowInWords });

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
    <div id="top" data-section="top" className="slide w-full h-[100dvh] md:h-screen relative flex flex-col">
      {/* Hover Preview Popup */}
      {artwork ? (
        <div
          className={`pointer-events-none fixed z-[100] flex-shrink-0 ${
            showTrackPreview ? "visible" : "invisible"
          }`}
          style={{
            width: TRACK_POPUP_SIZE,
            height: TRACK_POPUP_SIZE,
            left: cursorPosition.x,
            top: Math.max(16, cursorPosition.y - TRACK_POPUP_SIZE - 16),
            transform: "translateX(-50%)",
          }}
          aria-hidden={!showTrackPreview}
        >
          <HoverGlass flush>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={artwork}
              alt={
                spotifyData?.track
                  ? `${spotifyData.track.title} album cover`
                  : "Spotify album cover"
              }
              className="size-full object-cover"
            />
          </HoverGlass>
        </div>
      ) : null}

      {/*
        Keep glass at full opacity — fading opacity on a backdrop-filter layer
        makes the browser recompute the effect each frame (stepped / laggy).
      */}
      {contributionWeeks ? (
        <div
          className={`pointer-events-none fixed z-[100] flex-shrink-0 ${
            showCommitsPreview ? "visible" : "invisible"
          }`}
          style={{
            width: commitsPopupSize.width,
            height: commitsPopupSize.height,
            left: cursorPosition.x,
            top: Math.max(16, cursorPosition.y - previewHeight - 16),
            transform: "translateX(-50%)",
          }}
          aria-hidden={!showCommitsPreview}
        >
          <HoverGlass contentClassName="flex size-full items-center justify-center p-[10px]">
            <ContributionGraph weeks={contributionWeeks} />
          </HoverGlass>
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
        <HoverGlass contentClassName="flex size-full flex-col justify-between p-[10px]">
          {parisWeatherCode !== null ? (
            <WeatherIcon
              condition={getWeatherCondition(parisWeatherCode)}
              className="size-8 text-white"
            />
          ) : (
            <span aria-hidden="true" />
          )}
          <span className="font-mono text-3xl tabular-nums text-foreground leading-none">
            {parisTemperature}°C
          </span>
        </HoverGlass>
      </div>

      <div
        className={`pointer-events-none fixed z-[100] flex-shrink-0 ${
          showTimePreview ? "visible" : "invisible"
        }`}
        style={{
          width: TRACK_POPUP_SIZE,
          height: TRACK_POPUP_SIZE,
          left: cursorPosition.x,
          top: Math.max(16, cursorPosition.y - TRACK_POPUP_SIZE - 16),
          transform: "translateX(-50%)",
        }}
        aria-hidden={!showTimePreview}
      >
        <HoverGlass contentClassName="flex size-full items-center justify-center p-[10px]">
          <AnalogueClock
            hours={clockHands.hours}
            minutes={clockHands.minutes}
            seconds={clockHands.seconds}
            className="size-full text-foreground"
          />
        </HoverGlass>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center px-6 md:px-8 lg:px-10">
        <h1
          className="text-pretty text-2xl md:text-4xl lg:text-5xl xl:text-6xl font-normal text-foreground leading-[1.15] max-w-2xl xl:max-w-4xl"
          onPointerMove={handleTitlePointerMove}
          onPointerLeave={handleTitlePointerLeave}
        >
          {animatedTitleSegments.map((segment) => {
            if (segment.type === "hover") {
              return (
                <span
                  key={segment.key}
                  ref={
                    segment.preview === "weather"
                      ? parisLinkRef
                      : segment.preview === "time"
                        ? timeLinkRef
                        : undefined
                  }
                  role="presentation"
                  data-title-focus={segment.key}
                  data-title-preview={segment.preview}
                  className={`cursor-pointer transition-opacity duration-300 ease-out ${titleLinkOpacity(segment.key)}`}
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
              const preview = isTrackLink
                ? "track"
                : isCommitsLink
                  ? "commits"
                  : undefined;

              return (
                <a
                  key={segment.key}
                  href={segment.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  ref={isTrackLink ? trackLinkRef : isCommitsLink ? commitsLinkRef : undefined}
                  data-title-focus={segment.key}
                  data-title-preview={preview}
                  className={`transition-opacity duration-300 ease-out ${titleLinkOpacity(segment.key)}`}
                  data-sfx="click"
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

            if (segment.type === "emphasis") {
              return (
                <span
                  key={segment.key}
                  className={`transition-opacity duration-300 ease-out ${
                    titleFocusKey !== null ? "opacity-40" : "opacity-100"
                  }`}
                >
                  <StreamingWords
                    words={segment.words}
                    animatedWordKeysRef={animatedWordKeysRef}
                  />
                </span>
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
          <div className="group/quick text-sm text-foreground">
            <a
              href="https://x.com/dappdesigner"
              target="_blank"
              rel="noopener noreferrer"
              data-sfx="click"
              data-sfx-hover="tick"
              className="opacity-100 transition-opacity duration-300 ease-out group-hover/quick:opacity-40 hover:!opacity-100"
            >
              X
            </a>
            <span className="pointer-events-none transition-opacity duration-300 ease-out group-hover/quick:opacity-40">
              ,{" "}
            </span>
            <a
              href="https://www.instagram.com/komolkin/"
              target="_blank"
              rel="noopener noreferrer"
              data-sfx="click"
              data-sfx-hover="tick"
              className="opacity-100 transition-opacity duration-300 ease-out group-hover/quick:opacity-40 hover:!opacity-100"
            >
              Instagram
            </a>
            <span className="pointer-events-none transition-opacity duration-300 ease-out group-hover/quick:opacity-40">
              ,{" "}
            </span>
            <a
              href="https://github.com/komolkin"
              target="_blank"
              rel="noopener noreferrer"
              data-sfx="click"
              data-sfx-hover="tick"
              className="opacity-100 transition-opacity duration-300 ease-out group-hover/quick:opacity-40 hover:!opacity-100"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
