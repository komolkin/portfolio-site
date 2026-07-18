"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_WORLD_CUP_COUNTRY_ID,
  getWorldCupFlagUrl,
  WORLD_CUP_2026_COUNTRIES,
} from "@/lib/ai-cam/world-cup-countries";
import { canUseNativeShare, createShareFileFromDataUrl, prepareShareFile, startNativeShare } from "@/lib/ai-cam/native-share";
import AiCamGlimmLoader from "@/components/playground/projects/ai-cam/AiCamGlimmLoader";

type CameraState = "idle" | "loading" | "active" | "error";

const CLOSE_THRESHOLD = 72;
const STORY_ASPECT = 9 / 16;
const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;
const PHONE_WIDTH = 280;
const PHONE_HEIGHT = 580;
const GENERATION_STATUS_MESSAGES = [
  "Polishing the golden cup…",
  "Firing up the floodlights…",
  "Handing out fan scarves…",
  "Raising the flags…",
  "Warming up the celebration…",
  "Finding the perfect selfie angle…",
];

function stopStream(
  streamRef: React.MutableRefObject<MediaStream | null>,
  videoRef: React.RefObject<HTMLVideoElement | null>,
) {
  streamRef.current?.getTracks().forEach((track) => track.stop());
  streamRef.current = null;
  if (videoRef.current) {
    videoRef.current.srcObject = null;
  }
}

/** Prefer the widest native field of view — high-res / portrait ideals often
 * trigger a cropped (digitally zoomed) mode on mobile front cameras. */
async function openUserCamera(): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: "user" },
    },
    audio: false,
  });

  const track = stream.getVideoTracks()[0];
  if (!track?.getCapabilities) return stream;

  try {
    const capabilities = track.getCapabilities() as MediaTrackCapabilities & {
      zoom?: { min: number; max: number };
      resizeMode?: string[];
    };
    const next: MediaTrackConstraints & {
      zoom?: number;
      resizeMode?: string;
    } = {};

    if (capabilities.zoom && typeof capabilities.zoom.min === "number") {
      next.zoom = capabilities.zoom.min;
    }
    if (capabilities.resizeMode?.includes("none")) {
      next.resizeMode = "none";
    }

    if (Object.keys(next).length > 0) {
      await track.applyConstraints(next);
    }
  } catch {
    // Capabilities / constraints vary widely — keep the stream as-is.
  }

  return stream;
}

function getStoryCrop(videoWidth: number, videoHeight: number) {
  const videoAspect = videoWidth / videoHeight;

  if (videoAspect > STORY_ASPECT) {
    const cropHeight = videoHeight;
    const cropWidth = cropHeight * STORY_ASPECT;
    return {
      sx: (videoWidth - cropWidth) / 2,
      sy: 0,
      sw: cropWidth,
      sh: cropHeight,
    };
  }

  const cropWidth = videoWidth;
  const cropHeight = cropWidth / STORY_ASPECT;
  return {
    sx: 0,
    sy: (videoHeight - cropHeight) / 2,
    sw: cropWidth,
    sh: cropHeight,
  };
}

function captureStoryPhoto(video: HTMLVideoElement) {
  const { sx, sy, sw, sh } = getStoryCrop(video.videoWidth, video.videoHeight);
  const canvas = document.createElement("canvas");
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.save();
  ctx.translate(STORY_WIDTH, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, STORY_WIDTH, STORY_HEIGHT);
  ctx.restore();

  return canvas.toDataURL("image/jpeg", 0.92);
}

function compressReferenceImage(
  dataUrl: string,
  maxDimension = 768,
  quality = 0.88,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const longest = Math.max(img.width, img.height);
      const scale = longest > maxDimension ? maxDimension / longest : 1;
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not process the photo."));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("Could not read the captured photo."));
    img.src = dataUrl;
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export default function AiCam() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const dragStartY = useRef(0);
  const dragStartOffset = useRef(0);
  const lastCaptureRef = useRef<string | null>(null);
  const lastCountryIdRef = useRef(DEFAULT_WORLD_CUP_COUNTRY_ID);
  const lastFlagFacePaintRef = useRef(false);
  const shareFileRef = useRef<File | null>(null);

  const [cameraState, setCameraState] = useState<CameraState>("loading");
  const [countryId, setCountryId] = useState(DEFAULT_WORLD_CUP_COUNTRY_ID);
  const [flagFacePaint, setFlagFacePaint] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [generatedPhoto, setGeneratedPhoto] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerOffset, setDrawerOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  useEffect(() => {
    if (!isGenerating) {
      setLoadingMessageIndex(0);
      return;
    }

    const intervalId = window.setInterval(() => {
      setLoadingMessageIndex((index) => (index + 1) % GENERATION_STATUS_MESSAGES.length);
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, [isGenerating]);

  useEffect(() => {
    let cancelled = false;

    const startCamera = async () => {
      setCameraState("loading");
      setErrorMessage(null);
      stopStream(streamRef, videoRef);

      try {
        const stream = await openUserCamera();

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        video.srcObject = stream;

        try {
          await video.play();
        } catch (playErr) {
          if (cancelled) return;
          if (playErr instanceof DOMException && playErr.name === "AbortError") return;
          throw playErr;
        }

        if (!cancelled) setCameraState("active");
      } catch (err) {
        if (cancelled) return;
        stopStream(streamRef, videoRef);
        setCameraState("error");
        if (err instanceof DOMException) {
          if (err.name === "NotAllowedError") {
            setErrorMessage("Camera access denied. Allow camera permission and try again.");
          } else if (err.name === "NotFoundError") {
            setErrorMessage("No camera found on this device.");
          } else {
            setErrorMessage(err.message || "Could not access the camera.");
          }
        } else {
          setErrorMessage("Could not access the camera.");
        }
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      stopStream(streamRef, videoRef);
    };
  }, [retryKey]);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setDrawerOffset(0);
    setIsDragging(false);
    setGenerateError(null);
    setIsGenerating(false);
    setShareError(null);
    setIsSharing(false);
    shareFileRef.current = null;
  }, []);

  const generateStadiumSelfie = useCallback(
    async (captureDataUrl: string, selectedCountryId: string, selectedFlagFacePaint: boolean) => {
    setIsGenerating(true);
    setGenerateError(null);
    setGeneratedPhoto(null);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 90000);
    const selectedCountry = WORLD_CUP_2026_COUNTRIES.find((country) => country.id === selectedCountryId);

    try {
      const referenceImage = await compressReferenceImage(captureDataUrl);

      const response = await fetch("/api/ai-cam/transform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: referenceImage,
          countryId: selectedCountryId,
          flagFacePaint: selectedFlagFacePaint,
        }),
        signal: controller.signal,
      });

      const data = (await response.json()) as {
        imageUrl?: string;
        imageDataUrl?: string;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error || "Could not generate the stadium selfie.");
      }

      const photo = data.imageDataUrl ?? data.imageUrl;
      if (!photo) {
        throw new Error("Model returned no image.");
      }

      setGeneratedPhoto(photo);
      shareFileRef.current = null;

      if (photo.startsWith("data:image/")) {
        void prepareShareFile(photo, selectedCountryId)
          .then((file) => {
            shareFileRef.current = file;
          })
          .catch(() => {
            shareFileRef.current = createShareFileFromDataUrl(photo, selectedCountryId);
          });
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setGenerateError("Generation timed out. Please try again.");
        return;
      }
      setGenerateError(
        err instanceof Error
          ? err.message
          : `Could not generate the ${selectedCountry?.label ?? "World Cup"} selfie.`,
      );
    } finally {
      window.clearTimeout(timeoutId);
      setIsGenerating(false);
    }
  }, []);

  const takePicture = () => {
    const video = videoRef.current;
    if (!video || cameraState !== "active" || video.videoWidth === 0 || isGenerating) return;

    const dataUrl = captureStoryPhoto(video);
    if (!dataUrl) return;

    lastCaptureRef.current = dataUrl;
    lastCountryIdRef.current = countryId;
    lastFlagFacePaintRef.current = flagFacePaint;
    setDrawerOffset(0);
    setDrawerOpen(true);

    setFlash(true);
    window.setTimeout(() => setFlash(false), 120);

    void generateStadiumSelfie(dataUrl, countryId, flagFacePaint);
  };

  const retryGeneration = () => {
    if (!lastCaptureRef.current) return;
    void generateStadiumSelfie(
      lastCaptureRef.current,
      lastCountryIdRef.current,
      lastFlagFacePaintRef.current,
    );
  };

  const getGeneratedPhotoBlob = () => {
    if (!generatedPhoto) return null;
    if (generatedPhoto.startsWith("data:image/")) {
      return dataUrlToBlob(generatedPhoto);
    }
    return null;
  };

  const downloadPhoto = () => {
    if (!generatedPhoto) return;

    const blob = getGeneratedPhotoBlob();
    if (blob) {
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `ai-cam-${lastCountryIdRef.current}-world-cup-${Date.now()}.jpg`;
      link.click();
      URL.revokeObjectURL(objectUrl);
      return;
    }

    void (async () => {
      try {
        const response = await fetch(generatedPhoto);
        const fetchedBlob = await response.blob();
        const objectUrl = URL.createObjectURL(fetchedBlob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = `ai-cam-${lastCountryIdRef.current}-world-cup-${Date.now()}.jpg`;
        link.click();
        URL.revokeObjectURL(objectUrl);
      } catch {
        window.open(generatedPhoto, "_blank", "noopener,noreferrer");
      }
    })();
  };

  const sharePhoto = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    if (!generatedPhoto || isSharing) return;

    const countryLabel =
      WORLD_CUP_2026_COUNTRIES.find((country) => country.id === lastCountryIdRef.current)?.label ??
      "World Cup";

    const file =
      shareFileRef.current ??
      (generatedPhoto.startsWith("data:image/")
        ? createShareFileFromDataUrl(generatedPhoto, lastCountryIdRef.current)
        : null);

    if (!file) {
      setShareError("Photo is not ready to share yet.");
      return;
    }

    if (!canUseNativeShare()) {
      downloadPhoto();
      setShareError("Share unavailable here — photo downloaded instead.");
      return;
    }

    setShareError(null);
    setIsSharing(true);

    startNativeShare(file, {
      title: `${countryLabel} World Cup selfie`,
      text: `My ${countryLabel} World Cup selfie from Selfie`,
    })
      .then((result) => {
        if (result === "unsupported") {
          downloadPhoto();
          setShareError("Share unavailable — photo downloaded instead.");
        }
      })
      .catch((err: unknown) => {
        setShareError(err instanceof Error ? err.message : "Could not share the photo.");
      })
      .finally(() => {
        setIsSharing(false);
      });
  };

  const handleDrawerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drawerOpen || (e.target as HTMLElement).closest("button")) return;
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartOffset.current = drawerOffset;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleDrawerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const delta = e.clientY - dragStartY.current;
    setDrawerOffset(Math.max(0, dragStartOffset.current + delta));
  };

  const handleDrawerPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDragging(false);

    if (drawerOffset > CLOSE_THRESHOLD) {
      closeDrawer();
      return;
    }

    setDrawerOffset(0);
  };

  const selectedCountryLabel =
    WORLD_CUP_2026_COUNTRIES.find((country) => country.id === countryId)?.label ?? "World Cup";

  const selectedCountryFlagUrl = getWorldCupFlagUrl(countryId);
  const facePaintTooltip = flagFacePaint ? "Remove face paint" : "Add face paint";

  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <div
        className="relative overflow-hidden rounded-[2.75rem] bg-black"
        style={{ width: PHONE_WIDTH, height: PHONE_HEIGHT }}
        aria-label="Selfie — phone camera preview"
      >
        <video
          ref={videoRef}
          className="h-full w-full scale-x-[-1] object-cover object-center max-md:object-contain"
          playsInline
          muted
          autoPlay
        />

        {flash && <div className="pointer-events-none absolute inset-0 z-10 bg-white" />}

        {cameraState === "error" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/90 px-6 text-center">
            <p className="text-sm text-white/70">{errorMessage}</p>
            <button
              type="button"
              onClick={() => setRetryKey((key) => key + 1)}
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90"
            >
              Try again
            </button>
          </div>
        )}

        <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 items-center gap-8">
          <div
            className={`group relative shrink-0 ${
              cameraState !== "active" || isGenerating ? "pointer-events-none opacity-40" : ""
            }`}
          >
            <label className="relative flex h-11 w-11 cursor-pointer overflow-hidden rounded-full border border-white/20 bg-white/10 backdrop-blur-md transition-transform active:scale-95">
              <select
                id="ai-cam-country"
                value={countryId}
                onChange={(event) => setCountryId(event.target.value)}
                disabled={cameraState !== "active" || isGenerating}
                className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
                aria-label={`Select country, selected ${selectedCountryLabel}`}
              >
                {WORLD_CUP_2026_COUNTRIES.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.label}
                  </option>
                ))}
              </select>
              <img
                src={selectedCountryFlagUrl}
                alt=""
                className="pointer-events-none h-full w-full object-cover"
                draggable={false}
              />
            </label>
            <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/50 px-2 py-1 text-[11px] text-white opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100">
              Select country
            </span>
          </div>
          <button
            type="button"
            onClick={takePicture}
            disabled={cameraState !== "active" || isGenerating}
            className="h-[52px] w-[52px] rounded-full border-[3px] border-white bg-white/10 ring-4 ring-white/20 transition-transform active:scale-95 disabled:opacity-40"
            aria-label="Take picture"
          />
          <div className="group relative">
            <button
              type="button"
              onClick={() => {
                setFlagFacePaint((active) => !active);
                (document.activeElement as HTMLElement | null)?.blur();
              }}
              disabled={cameraState !== "active" || isGenerating}
              aria-pressed={flagFacePaint}
              aria-label={facePaintTooltip}
              className={`flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-md transition-transform active:scale-95 disabled:opacity-40 ${
                flagFacePaint
                  ? "border-white/50 bg-white/25 text-white ring-2 ring-white/30"
                  : "border-white/20 bg-white/10 text-white/75"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" x2="9.01" y1="9" y2="9" />
                <line x1="15" x2="15.01" y1="9" y2="9" />
              </svg>
            </button>
            <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/50 px-2 py-1 text-[11px] text-white opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100">
              {facePaintTooltip}
            </span>
          </div>
        </div>

        <div
          className={`absolute inset-0 z-30 bg-black/50 transition-opacity duration-300 ${
            drawerOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          }`}
          onClick={closeDrawer}
          aria-hidden={!drawerOpen}
        />

        <div
          role="dialog"
          aria-modal="true"
          aria-label="Generated stadium selfie"
          className={`absolute inset-x-0 bottom-0 z-40 flex h-[97%] flex-col overflow-hidden rounded-t-[1.75rem] bg-[#111] shadow-[0_-12px_40px_rgba(0,0,0,0.45)] ${
            drawerOpen ? "pointer-events-auto" : "pointer-events-none"
          }`}
          style={{
            transform: drawerOpen ? `translateY(${drawerOffset}px)` : "translateY(100%)",
            transition: isDragging ? "none" : "transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
          }}
          onPointerDown={handleDrawerPointerDown}
          onPointerMove={handleDrawerPointerMove}
          onPointerUp={handleDrawerPointerUp}
          onPointerCancel={handleDrawerPointerUp}
        >
          {isGenerating && <AiCamGlimmLoader active className="absolute inset-0 z-0" />}

          {isGenerating && (
            <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 px-4 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              <p className="text-xs text-white/60">{GENERATION_STATUS_MESSAGES[loadingMessageIndex]}</p>
            </div>
          )}

          {!isGenerating && generatedPhoto && (
            <img
              src={generatedPhoto}
              alt="Stadium selfie"
              className="absolute inset-0 h-full w-full object-cover"
              draggable={false}
            />
          )}

          {!isGenerating && (
            <button
              type="button"
              onClick={closeDrawer}
              onPointerDown={(event) => event.stopPropagation()}
              className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-transform hover:bg-white/20 active:scale-95"
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          )}

          <div className="relative z-10 flex shrink-0 justify-center pb-2 pt-3">
            <div className="h-1 w-10 rounded-full bg-white/30" />
          </div>

          <div className="relative z-10 min-h-0 flex-1">
            {!isGenerating && generateError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-4 text-center">
                <p className="text-sm text-white/70">{generateError}</p>
                <button
                  type="button"
                  onClick={retryGeneration}
                  className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90"
                >
                  Try again
                </button>
              </div>
            )}
          </div>

          {!isGenerating && (
            <div className="relative z-10 shrink-0 bg-gradient-to-t from-black/80 via-black/45 to-transparent px-4 pb-6 pt-8">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={downloadPhoto}
                  disabled={!generatedPhoto}
                  className="min-w-0 flex-1 rounded-full border border-white/20 bg-white/10 py-3 text-sm font-semibold text-white backdrop-blur-md transition-transform hover:bg-white/20 active:scale-95 disabled:opacity-40"
                >
                  Download photo
                </button>
                <button
                  type="button"
                  onClick={sharePhoto}
                  onPointerDown={(event) => event.stopPropagation()}
                  disabled={!generatedPhoto || isSharing}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-transform hover:bg-white/20 active:scale-95 disabled:opacity-40"
                  aria-label="Share photo"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path d="M12 3v12" />
                    <path d="m7 8 5-5 5 5" />
                    <path d="M5 21h14" />
                  </svg>
                </button>
              </div>
              {shareError && <p className="mt-2 text-center text-xs text-red-300/90">{shareError}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
