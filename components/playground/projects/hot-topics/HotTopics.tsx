"use client";

import Image from "next/image";
import { useState } from "react";
import { HOT_TOPICS } from "./topics";

/**
 * Raster / layout from Figma Preview (node 11972:28939):
 * https://www.figma.com/design/XSjBMcMS96jS8ntZIpMukQ/Ilya?node-id=11972-28939
 * Assets under public/playground/hot-topics/
 */
const CARD_WIDTH = 184;
const CARD_HEIGHT = 254;
/** Playground display scale (keeps Figma pixels, enlarges for the slide). */
const DISPLAY_SCALE = 1.35;
const MOBILE_SCALE = 0.7;
const FADE_OVERLAY = "/playground/hot-topics/fade-overlay.png";

export default function HotTopics() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  // First topic (Lebanon) is selected by default; hover overrides.
  const activeIndex = hoveredIndex ?? 0;

  const displayWidth = CARD_WIDTH * DISPLAY_SCALE;
  const displayHeight = CARD_HEIGHT * DISPLAY_SCALE;

  return (
    <div className="relative flex h-full w-full items-center justify-center px-4">
      {/*
        Mobile: sized shell + transform scale so layout matches the visual.
        marginBottom stays outside the scale so bottom spacing isn't lost.
      */}
      <div
        className="relative mb-6 shrink-0 md:mb-0 md:contents"
        style={{
          width: displayWidth * MOBILE_SCALE,
          height: displayHeight * MOBILE_SCALE,
        }}
      >
        <div
          className="relative origin-top-left max-md:scale-[0.7]"
          style={{
            width: displayWidth,
            minWidth: displayWidth,
            maxWidth: displayWidth,
            height: displayHeight,
          }}
        >
          <article
            className="relative overflow-hidden rounded-2xl bg-[#1d1d1d]"
            style={{
              width: CARD_WIDTH,
              height: CARD_HEIGHT,
              transform: `scale(${DISPLAY_SCALE})`,
              transformOrigin: "top left",
            }}
            aria-label="Hot topics"
          >
            {/* Background — swaps instantly on topic hover */}
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <Image
                src={HOT_TOPICS[activeIndex].image}
                alt=""
                fill
                sizes={`${CARD_WIDTH}px`}
                className="object-cover object-[center_28%]"
                priority
              />
              {/* Keep other topic images warm so swaps are instant */}
              {HOT_TOPICS.map((topic, index) =>
                index === activeIndex ? null : (
                  <Image
                    key={topic.id}
                    src={topic.image}
                    alt=""
                    width={CARD_WIDTH}
                    height={CARD_HEIGHT}
                    className="hidden"
                  />
                ),
              )}

              {/* Figma Fade — -rotate-180 -scale-x-100 so dark sits over the list */}
              <div className="absolute inset-0 flex items-center justify-center [container-type:size]">
                <div className="relative h-[100cqh] w-[100cqw] -rotate-180 -scale-x-100">
                  <Image
                    src={FADE_OVERLAY}
                    alt=""
                    fill
                    sizes={`${CARD_WIDTH}px`}
                    className="object-cover"
                  />
                </div>
              </div>
            </div>

            <div className="absolute inset-3 flex flex-col justify-between">
              <h2 className="w-full truncate text-[15px] font-medium leading-normal text-white">
                Hot topics
              </h2>

              <ul
                className="flex w-full flex-col gap-0.5"
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {HOT_TOPICS.map((topic, index) => {
                  const isActive = index === activeIndex;

                  return (
                    <li key={topic.id}>
                      <button
                        type="button"
                        className={`flex w-full items-center gap-4 text-left transition-opacity duration-200 ${
                          isActive ? "opacity-100" : "opacity-40"
                        }`}
                        onMouseEnter={() => setHoveredIndex(index)}
                        onFocus={() => setHoveredIndex(index)}
                        onBlur={() => setHoveredIndex(null)}
                      >
                        <span className="flex min-w-0 flex-1 items-center gap-0.5">
                          <span className="w-3.5 shrink-0 text-xs font-semibold leading-[1.25] text-white/60">
                            {topic.rank}
                          </span>
                          <span className="min-w-0 truncate text-xs font-semibold leading-[1.25] text-white">
                            {topic.name}
                          </span>
                        </span>
                        <span className="shrink-0 whitespace-nowrap text-xs font-semibold leading-[1.25] text-white">
                          {topic.value}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
