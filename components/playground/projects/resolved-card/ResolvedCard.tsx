"use client";

import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";

/**
 * Raster assets from Figma frame "Resolved / Yes" (node 1152:22332):
 * https://www.figma.com/design/XSjBMcMS96jS8ntZIpMukQ/Ilya?node-id=1152-22332
 * Files live under public/playground/resolved-card/ (re-export from Figma if you refresh art).
 */
const IMG_AVATAR = "/playground/resolved-card/avatar.png";
const IMG_YES = "/playground/resolved-card/yes.png";
/** Share control — Figma Frame (node 1154:23130) */
const IMG_SHARE_ICON = "/playground/resolved-card/share-icon.svg";

export default function ResolvedCard() {
  const [claimState, setClaimState] = useState<"idle" | "claiming" | "claimed">("idle");
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<number | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const lastMoveRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const PRELOAD_ASSETS = [IMG_AVATAR, IMG_YES];

  useEffect(() => {
    let cancelled = false;

    const preloadAssets = async () => {
      await Promise.allSettled(
        PRELOAD_ASSETS.map(
          (src) =>
            new Promise<void>((resolve) => {
              const img = new window.Image();
              img.onload = () => resolve();
              img.onerror = () => resolve();
              img.src = src;
            }),
        ),
      );
    };

    // Register the web component and preload all card assets before revealing.
    Promise.allSettled([import("hover-tilt/web-component"), preloadAssets()]).finally(() => {
      if (cancelled) return;
      rafRef.current = window.requestAnimationFrame(() => {
        setIsVisible(true);
        rafRef.current = null;
      });
    });

    return () => {
      cancelled = true;
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  const handleClaim = () => {
    if (claimState !== "idle") return;
    setClaimState("claiming");
    timerRef.current = window.setTimeout(() => {
      setClaimState("claimed");
      timerRef.current = window.setTimeout(() => {
        setClaimState("idle");
        timerRef.current = null;
      }, 3000);
    }, 3000);
  };

  const handleShare = async () => {
    const url = window.location.href;
    const nav = navigator as Navigator & { share?: (data: { url: string; title?: string }) => Promise<unknown> };

    try {
      if (nav.share) {
        await nav.share({
          url,
          title: document.title || "Portfolio",
        });
        return;
      }
    } catch {
      // Fall back to clipboard below.
    }

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Intentionally no-op: sharing is a progressive enhancement.
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    const el = cardRef.current;
    if (!el) return;

    el.style.setProperty("--ov", "1");

    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const dx = (e.clientX - cx) * (2 / 3);
    const dy = (e.clientY - cy) * (2 / 3);

    el.style.setProperty("--rbx", `${dx}px`);
    el.style.setProperty("--rby", `${dy}px`);

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty("--cx", `${x}px`);
    el.style.setProperty("--cy", `${y}px`);

    lastMoveRef.current = { x, y, t: performance.now() };
  };

  const handleMouseLeave = () => {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty("--ov", "0");
    el.style.setProperty("--rbx", "0px");
    el.style.setProperty("--rby", "0px");
    el.style.setProperty("--cx", "0px");
    el.style.setProperty("--cy", "0px");
    lastMoveRef.current = null;
  };

  return (
    <div className="relative flex items-center justify-center p-4 pb-8 md:pb-4">
      {/* Padding lives on the outer shell so the card can be a full 360px wide (not 360px minus padding). */}
      <div className="relative w-[360px] min-w-[360px] max-w-[360px] shrink-0">
        <svg width="0" height="0" aria-hidden="true" focusable="false">
          <defs>
            <mask id="resolvedCardRoundMask" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse">
              <rect x="0" y="0" width="360" height="468" rx="24" ry="24" fill="white" />
            </mask>
          </defs>
        </svg>
        <hover-tilt
          tilt-factor="0.8"
          scale-factor="1.02"
          glare-intensity="0.4"
          glare-hue="270"
          glare-mask="url(#resolvedCardRoundMask)"
          glare-mask-mode="alpha"
          shadow
          className="resolvedCardTilt resolvedCardTiltHost block h-auto w-full min-w-[360px]"
        >
        <div className="relative w-full overflow-hidden rounded-[24px]" style={{ height: 468 }}>
          {/* Reserve final size and fade in smoothly once ready */}
          <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={`resolvedCardRainbow relative w-full overflow-hidden rounded-[24px] transition-opacity duration-300 ease-out ${
              isVisible ? "opacity-100" : "opacity-0"
            }`}
            style={{ height: 468, background: "#1d1d1d" }}
          >
          {/* Content overlay */}
          <div className="relative z-30 flex h-full flex-col gap-4 p-4">
            <div className="flex flex-1 flex-col items-center justify-center pt-10 pb-4">
              <div className="flex flex-col items-center gap-6">
                <div className="relative h-[120px] w-[120px] shrink-0">
                  <div className="absolute inset-0 rounded-xl">
                    <img
                      src={IMG_AVATAR}
                      alt=""
                      className="size-full rounded-xl object-cover"
                    />
                  </div>
                  <div
                    className="absolute left-[29px] top-[103px] h-[30px] w-[62px] overflow-hidden"
                    aria-hidden
                  >
                    <img
                      src={IMG_YES}
                      alt="YES"
                      className="absolute left-[-9.4%] top-[-32.89%] h-[169.74%] w-[119.39%] max-w-none"
                    />
                  </div>
                </div>
                <div className="flex w-full flex-col items-center gap-1 text-center">
                  <p className="text-base leading-[1.25] text-white/60">
                    Best Actor winner at Oscars 2026?
                  </p>
                  <p className="text-2xl font-semibold leading-[1.25] text-white">
                    Michael B. Jordan
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-auto flex w-full flex-col gap-[10px]">
              {/* Cost / Won — same shell as Binary Market / Leverage success summary */}
              <div className="flex w-full flex-col gap-3 rounded-3xl bg-white/[0.04] p-4">
                <div className="flex items-center justify-between text-sm leading-[1.25]">
                  <span className="text-white/60">Cost</span>
                  <span className="text-white">$32.00</span>
                </div>
                <div className="h-px w-full bg-white/10" aria-hidden />
                <div className="flex items-center justify-between gap-3">
                  <span className="shrink-0 text-2xl font-semibold leading-none text-white/60">Won</span>
                  <span className="min-w-0 text-right text-2xl font-normal leading-[1.25] text-[#5dd978] font-mono tabular-nums">
                    $1,534.00
                  </span>
                </div>
              </div>
              {/* Claim button */}
              <div className="flex w-full items-center gap-[10px]">
                <button
                  type="button"
                  onClick={handleClaim}
                  disabled={claimState !== "idle"}
                  aria-busy={claimState === "claiming"}
                  className="h-10 flex-1 shrink-0 overflow-hidden rounded-full border border-white/10 bg-transparent text-center text-sm font-semibold leading-[1.25] text-white transition-[transform,border-color,background-color,opacity] duration-150 ease-out hover:border-white/15 hover:bg-white/[0.06] active:scale-[0.95] disabled:cursor-not-allowed disabled:opacity-80"
                >
                  <span className="relative inline-flex h-full w-full items-center justify-center">
                    <span
                      className={`absolute inset-0 inline-flex items-center justify-center gap-2 transition-all duration-200 ease-out ${
                        claimState === "idle"
                          ? "opacity-100 translate-y-0"
                          : "opacity-0 translate-y-0.5"
                      }`}
                      aria-hidden={claimState !== "idle"}
                    >
                      <span>Claim</span>
                    </span>

                    <span
                      className={`absolute inset-0 inline-flex items-center justify-center gap-2 transition-all duration-200 ease-out ${
                        claimState === "claiming"
                          ? "opacity-100 translate-y-0"
                          : "opacity-0 translate-y-0.5"
                      }`}
                      aria-hidden={claimState !== "claiming"}
                    >
                      <span
                        className="inline-block h-4 w-4 rounded-full border-2 border-white/25 border-t-white animate-spin"
                        aria-hidden
                      />
                      <span>Claiming</span>
                    </span>

                    <span
                      className={`absolute inset-0 inline-flex items-center justify-center gap-2 transition-all duration-200 ease-out ${
                        claimState === "claimed"
                          ? "opacity-100 translate-y-0"
                          : "opacity-0 translate-y-0.5"
                      }`}
                      aria-hidden={claimState !== "claimed"}
                    >
                      <span
                        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white"
                        aria-hidden
                      >
                        <svg
                          width="10"
                          height="8"
                          viewBox="0 0 12 9"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M1 4.5L4.25 7.75L11 1"
                            stroke="#009D59"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      <span>Claimed</span>
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  aria-label="Share"
                  className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 text-white transition-[transform,border-color,background-color] duration-150 ease-out hover:border-white/15 hover:bg-white/[0.06] active:scale-[0.95]"
                >
                  <img
                    src={IMG_SHARE_ICON}
                    alt=""
                    width={16}
                    height={16}
                    className="size-4"
                    draggable={false}
                    aria-hidden
                  />
                </button>
              </div>
            </div>
          </div>
          </div>

        </div>
      </hover-tilt>
      </div>
      <style jsx>{`
        :global(hover-tilt.resolvedCardTiltHost) {
          width: 360px;
          min-width: 360px;
          max-width: 360px;
          display: block;
          overflow: hidden;
          border-radius: 24px;
          clip-path: inset(0 round 24px);
        }

        .resolvedCardTilt {
          overflow: hidden;
          border-radius: 24px;
          clip-path: inset(0 round 24px);
        }

        .resolvedCardRainbow {
          isolation: isolate;
          transform-style: preserve-3d;
          overflow: hidden;
          border-radius: 24px;
          clip-path: inset(0 round 24px);
          transition: transform 0.4s ease;
        }

        .resolvedCardRainbow::before,
        .resolvedCardRainbow::after {
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: 24px;
          overflow: hidden;
        }

        .resolvedCardRainbow::before {
          content: "";
          mix-blend-mode: color-dodge;
          opacity: calc(var(--ov, 0) * 0.28);
          transition: opacity 220ms ease;
          background-image: repeating-linear-gradient(
            135deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.34) 26%,
            rgba(200, 202, 208, 0.2) 44%,
            rgba(255, 255, 255, 0.14) 58%,
            rgba(255, 255, 255, 0) 100%
          );
          background-size: 200% 200%;
          background-position: calc(50% + var(--rbx, 0px))
            calc(50% + var(--rby, 0px));
          z-index: 20;
        }

        .resolvedCardRainbow::after {
          content: "";
          mix-blend-mode: overlay;
          opacity: calc(var(--ov, 0) * 0.7);
          transition: opacity 220ms ease;
          background-image: radial-gradient(
            circle at var(--cx, 0px) var(--cy, 0px),
            rgba(255, 255, 255, 0.18) 0%,
            rgba(255, 255, 255, 0.08) 22%,
            rgba(255, 255, 255, 0) 56%
          );
          background-repeat: no-repeat;
          -webkit-mask-image: radial-gradient(
            circle at var(--cx, 0px) var(--cy, 0px),
            rgba(0, 0, 0, 1) 0%,
            rgba(0, 0, 0, 0) 56%
          );
          mask-image: radial-gradient(
            circle at var(--cx, 0px) var(--cy, 0px),
            rgba(0, 0, 0, 1) 0%,
            rgba(0, 0, 0, 0) 56%
          );
          z-index: 25;
        }
      `}</style>
    </div>
  );
}
