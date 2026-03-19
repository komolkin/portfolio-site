"use client";

import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";

// Figma MCP asset URLs (use within ~7 days or re-fetch from Figma)
const IMG_AVATAR =
  "https://www.figma.com/api/mcp/asset/33dac028-278c-4c0a-9049-8dc0f9da980a";
const IMG_YES =
  "https://www.figma.com/api/mcp/asset/1fde7823-fb1e-4f18-ad45-4655ac86ec4d";
const IMG_LINE =
  "https://www.figma.com/api/mcp/asset/f2e92dab-dcd5-4f23-baa3-cff80caaf101";

export default function ResolvedCard() {
  const [claimState, setClaimState] = useState<"idle" | "claiming" | "claimed">("idle");
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<number | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const lastMoveRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Register the web component on client only (prevents SSR `customElements` crash).
    import("hover-tilt/web-component").finally(() => {
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

  useEffect(() => {
    // Preload static Figma assets once for smoother first paint.
    const preloaded = [IMG_AVATAR, IMG_YES, IMG_LINE].map((src) => {
      const img = new window.Image();
      img.src = src;
      return img;
    });
    return () => {
      preloaded.forEach((img) => {
        img.onload = null;
        img.onerror = null;
      });
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

    const now = performance.now();
    const last = lastMoveRef.current;
    if (last) {
      const dt = Math.max(16, now - last.t);
      const dist = Math.hypot(x - last.x, y - last.y);
      const speed = dist / dt; // px per ms
      const reflect = Math.max(0, Math.min(1, speed * 1.15));
      const dotA = 0.12 + reflect * 0.35;
      el.style.setProperty("--da", `${dotA}`);
    }
    lastMoveRef.current = { x, y, t: now };
  };

  const handleMouseLeave = () => {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty("--ov", "0");
    el.style.setProperty("--rbx", "0px");
    el.style.setProperty("--rby", "0px");
    el.style.setProperty("--cx", "0px");
    el.style.setProperty("--cy", "0px");
    el.style.setProperty("--da", "0.12");
    lastMoveRef.current = null;
  };

  return (
    <div className="relative w-full max-w-[348px] flex items-center justify-center p-4">
      <svg width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <mask id="resolvedCardRoundMask" maskUnits="userSpaceOnUse">
            <rect x="0" y="0" width="1000" height="1000" rx="32" ry="32" fill="white" />
          </mask>
        </defs>
      </svg>
      <hover-tilt
        tilt-factor="0.8"
        scale-factor="1.02"
        glare-intensity="0.4"
        glare-hue="142"
        glare-mask="url(#resolvedCardRoundMask)"
        glare-mask-mode="alpha"
        shadow
        className="resolvedCardTilt block w-full"
      >
        <div className="relative w-full" style={{ height: 468 }}>
          {/* Reserve final size and fade in smoothly once ready */}
          <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={`resolvedCardRainbow relative w-full overflow-hidden rounded-[32px] transition-[opacity,transform] duration-300 ease-out ${
              isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-1 scale-[0.99]"
            }`}
            style={{ height: 468 }}
          >
          {/* Green gradient background (Figma) */}
          <div
            className="absolute inset-0 rounded-[32px]"
            style={{
              background:
                "linear-gradient(to bottom, rgba(0,255,132,0.4), rgba(0,157,89,0.4))",
            }}
            aria-hidden
          />
          {/* Content overlay */}
          <div className="relative z-30 flex h-full flex-col gap-4 p-4">
            <div className="flex flex-1 flex-col items-center justify-center pt-10 pb-4">
              <div className="flex flex-col items-center gap-6">
                <div className="relative h-[120px] w-[120px] shrink-0">
                  <div className="absolute inset-0 rounded-xl border border-white/20">
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
            <div className="mt-auto flex w-full flex-col gap-4">
              {/* Divider */}
              <div className="relative h-px w-full shrink-0">
                <img
                  src={IMG_LINE}
                  alt=""
                  className="block size-full max-w-none"
                  aria-hidden
                />
              </div>
              {/* Cost / Won */}
              <div className="flex w-full flex-col gap-1.5">
                <div className="flex w-full items-center justify-between text-sm">
                  <p className="text-white/60">Cost</p>
                  <p className="text-white">$32.00</p>
                </div>
                <div className="flex w-full items-center justify-between">
                  <p className="text-sm text-white/60">Won</p>
                  <p className="text-[30px] font-semibold leading-[1.25] text-white">
                    $1,534.00
                  </p>
                </div>
              </div>
              {/* Claim button */}
              <button
                type="button"
                onClick={handleClaim}
                disabled={claimState !== "idle"}
                aria-busy={claimState === "claiming"}
                className="h-12 w-full shrink-0 overflow-hidden rounded-full bg-white text-center text-base font-semibold leading-[1.25] text-[#141414] hover:bg-white/95 disabled:opacity-80 disabled:cursor-not-allowed transition-transform active:scale-[0.98]"
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
                      className="inline-block h-4 w-4 rounded-full border-2 border-[#141414]/25 border-t-[#141414] animate-spin"
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
                      className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#00FF84]"
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
                          stroke="white"
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
            </div>
          </div>
          </div>

        </div>
      </hover-tilt>
      <style jsx>{`
        .resolvedCardTilt {
          overflow: hidden;
          border-radius: 32px;
          clip-path: inset(0 round 32px);
        }

        .resolvedCardRainbow {
          isolation: isolate;
          transform-style: preserve-3d;
          overflow: hidden;
          clip-path: inset(0 round 32px);
          transition: transform 0.4s ease;
        }

        .resolvedCardRainbow::before,
        .resolvedCardRainbow::after {
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: inherit;
        }

        .resolvedCardRainbow::before {
          content: "";
          mix-blend-mode: color-dodge;
          opacity: calc(var(--ov, 0) * 0.28);
          transition: opacity 220ms ease;
          background-image:
            radial-gradient(
              circle,
              rgba(255, 255, 255, 0.16) 1px,
              rgba(255, 255, 255, 0) 1.6px
            ),
            repeating-linear-gradient(
              135deg,
              rgba(255, 255, 255, 0) 0%,
              rgba(255, 255, 255, 0.38) 26%,
              rgba(0, 255, 132, 0.12) 44%,
              rgba(255, 255, 255, 0.16) 58%,
              rgba(255, 255, 255, 0) 100%
            );
          background-size: 12px 12px, 200% 200%;
          background-position: 0px 0px,
            calc(50% + var(--rbx, 0px)) calc(50% + var(--rby, 0px));
          background-blend-mode: lighten;
          z-index: 20;
        }

        .resolvedCardRainbow::after {
          content: "";
          mix-blend-mode: overlay;
          opacity: calc(var(--ov, 0) * 0.7);
          transition: opacity 220ms ease;
          background-image:
            radial-gradient(
              circle at var(--cx, 0px) var(--cy, 0px),
              rgba(255, 255, 255, 0.18) 0%,
              rgba(255, 255, 255, 0.08) 22%,
              rgba(255, 255, 255, 0) 56%
            ),
            radial-gradient(
              circle,
              rgba(255, 255, 255, calc(var(--da, 0.12) * 0.8)) 1px,
              rgba(255, 255, 255, 0) 1.65px
            );
          background-repeat: no-repeat, repeat;
          background-size: auto, 12px 12px;
          background-position: 0px 0px, 0px 0px;
          background-blend-mode: normal, lighten;
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
