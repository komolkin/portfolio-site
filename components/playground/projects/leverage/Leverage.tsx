"use client";

import NumberFlow from "@number-flow/react";
import Image from "next/image";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  FOIL_POINTER_STYLE,
  GlassBorder,
  GlitterFoil,
  MagicSparkles,
  applyFoilPointer,
  clearFoilPointer,
} from "@/components/playground/card-foil";

/**
 * Prediction card from Figma (node 13358:15532):
 * https://www.figma.com/design/XSjBMcMS96jS8ntZIpMukQ/Ilya?node-id=13358-15532
 */
const IMG_THUMB = "/playground/leverage/agi-thumb.png";

const CARD_WIDTH = 309;
const CARD_HEIGHT = 254;
const CARD_RADIUS = 16;
const CHANCE_MIN = 25;
const CHANCE_MAX = 38;
const CHANCE_TICK_MS = 5000;
const INITIAL_CHANCE = 34;

const BUTTON_CLASS =
  "flex h-[38px] w-[128px] shrink-0 items-center justify-center rounded-xl border-2 border-white/10 px-4 text-base font-semibold leading-none [font-feature-settings:'lnum'_1,'tnum'_1] transition-transform duration-200 ease-out hover:-translate-y-[2px] active:translate-y-0.5 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80";

function randomChance(except: number) {
  const span = CHANCE_MAX - CHANCE_MIN;
  const next = CHANCE_MIN + Math.floor(Math.random() * span);
  return next >= except ? next + 1 : next;
}

export default function Leverage() {
  const [chance, setChance] = useState(INITIAL_CHANCE);
  const cardRef = useRef<HTMLElement>(null);
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      setChance((current) => randomChance(current));
    }, CHANCE_TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      reduceMotionRef.current = media.matches;
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (reduceMotionRef.current) return;
    const el = cardRef.current;
    if (el) applyFoilPointer(el, event.clientX, event.clientY);
  };

  const handlePointerLeave = () => {
    const el = cardRef.current;
    if (el) clearFoilPointer(el);
  };

  return (
    <div className="flex h-full w-full items-center justify-center px-4">
      <div className="relative [zoom:0.85] sm:[zoom:0.95] md:[zoom:1]">
        <MagicSparkles />
        <article
          ref={cardRef}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          className="relative isolate flex overflow-hidden rounded-2xl bg-[#1d1d1d] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
          style={{
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            ...FOIL_POINTER_STYLE,
          }}
          aria-label="AGI prediction"
        >
        <GlitterFoil />
        <div className="relative z-10 flex h-full flex-col justify-between">
          <div className="flex w-full items-start gap-3">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-[6px]">
              <Image
                src={IMG_THUMB}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
                priority
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <p className="line-clamp-2 text-base font-semibold leading-[1.25] text-white [font-family:ui-rounded,system-ui,sans-serif]">
                Will we achieve Artificial General Intelligence (AGI) by December 31,
                2026?
              </p>
              <p className="flex items-start gap-1.5 whitespace-nowrap text-sm font-normal leading-[1.25] text-white/40">
                <span>$6m Vol.</span>
                <span aria-hidden>⋅</span>
                <span>3x leverage</span>
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3">
            <div className="flex items-end gap-1.5">
              <NumberFlow
                value={chance}
                className="text-[48px] font-semibold leading-none text-white [font-family:ui-rounded,system-ui,sans-serif] [font-feature-settings:'lnum'_1,'tnum'_1]"
                style={{ ["--number-flow-mask-height" as string]: "0em" }}
              />
              <div className="pb-1">
                <p className="text-base font-normal leading-[1.25] text-white [font-feature-settings:'lnum'_1,'tnum'_1]">
                  %
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                data-sfx="click"
                className={`${BUTTON_CLASS} text-[#5dd978]`}
              >
                Yes
              </button>
              <button
                type="button"
                data-sfx="click"
                className={`${BUTTON_CLASS} text-[#ff4d5e]`}
              >
                No
              </button>
            </div>
          </div>
        </div>
        <GlassBorder radius={CARD_RADIUS} />
        </article>
      </div>
    </div>
  );
}
