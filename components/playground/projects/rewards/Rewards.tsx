"use client";

import { useId } from "react";

/**
 * Figma frame "Link Container" (node 9543:4713):
 * https://www.figma.com/design/XSjBMcMS96jS8ntZIpMukQ/Ilya?node-id=9543-4713
 */
const REWARDS_COLOR = "#018CFE";

const ICON_PATH =
  "M10.7576 0.75L10.9793 0.760742C11.4945 0.811787 11.9791 1.03985 12.3484 1.40918L15.3484 4.40918C16.2269 5.28783 16.2269 6.71217 15.3484 7.59082L9.9695 12.9697C9.09085 13.8483 7.66651 13.8483 6.78786 12.9697L1.40895 7.59082C0.530426 6.71217 0.530423 5.28783 1.40895 4.40918L4.40895 1.40918C4.83086 0.987276 5.40312 0.75006 5.99977 0.75H10.7576Z";
const CHEVRON_PATH = "M6.37868 4.5L4.87868 6L6.37868 7.5";

const VIEW_PAD = 2;
const VIEW_X = -VIEW_PAD;
const VIEW_Y = -VIEW_PAD;
const VIEW_W = 16.7574 + VIEW_PAD * 2;
const VIEW_H = 14.3787 + VIEW_PAD * 2;

const ICON_SIZE = 24;
const ICON_GAP = 6;
const LINK_HEIGHT = 24;
const TEXT_SIZE = 16;
const TEXT_LABEL = "Rewards";
const TEXT_X = ICON_SIZE + ICON_GAP;

const ICON_DISPLAY_H = (ICON_SIZE * VIEW_H) / VIEW_W;
const ICON_Y = (LINK_HEIGHT - ICON_DISPLAY_H) / 2;
const LINK_WIDTH = TEXT_X + 64;

const SHINE_BAND = 40;
const SHINE_START = -60;
const SHINE_END = 160;
const SHINE_DURATION = "3.5s";

const ICON_VIEWBOX = `${VIEW_X} ${VIEW_Y} ${VIEW_W} ${VIEW_H}`;

function IconPaths({ stroke }: { stroke: string }) {
  return (
    <>
      <path d={ICON_PATH} stroke={stroke} strokeWidth="1.5" fill="none" />
      <path
        d={CHEVRON_PATH}
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </>
  );
}

export default function Rewards() {
  const uid = useId().replace(/:/g, "");
  const shineId = `rewards-shine-${uid}`;

  return (
    <div className="relative flex items-center justify-center p-4">
      <svg
        role="img"
        aria-label={TEXT_LABEL}
        viewBox={`0 0 ${LINK_WIDTH} ${LINK_HEIGHT}`}
        style={{ height: LINK_HEIGHT, width: "auto" }}
        fill="none"
        className="block overflow-visible font-sans antialiased"
      >
        <defs>
          <linearGradient
            id={shineId}
            gradientUnits="userSpaceOnUse"
            x1={0}
            y1={0}
            x2={SHINE_BAND}
            y2={0}
          >
            <stop offset="0%" stopColor={REWARDS_COLOR} />
            <stop offset="38%" stopColor={REWARDS_COLOR} />
            <stop offset="50%" stopColor="#ffffff" />
            <stop offset="62%" stopColor={REWARDS_COLOR} />
            <stop offset="100%" stopColor={REWARDS_COLOR} />
            <animateTransform
              attributeName="gradientTransform"
              type="translate"
              values={`${SHINE_START} 0; ${SHINE_END} 0; ${SHINE_END} 0`}
              keyTimes="0;0.5;1"
              dur={SHINE_DURATION}
              repeatCount="indefinite"
              calcMode="spline"
              keySplines="0.65 0 0.35 1; 0.65 0 0.35 1"
            />
          </linearGradient>
        </defs>

        <svg
          x={0}
          y={ICON_Y}
          width={ICON_SIZE}
          height={ICON_DISPLAY_H}
          viewBox={ICON_VIEWBOX}
          overflow="visible"
          aria-hidden
        >
          <IconPaths stroke={REWARDS_COLOR} />
        </svg>

        <text
          x={TEXT_X}
          y={LINK_HEIGHT / 2}
          fill={REWARDS_COLOR}
          fontSize={TEXT_SIZE}
          fontWeight={600}
          dominantBaseline="central"
          className="font-semibold"
        >
          {TEXT_LABEL}
        </text>

        <svg
          x={0}
          y={ICON_Y}
          width={ICON_SIZE}
          height={ICON_DISPLAY_H}
          viewBox={ICON_VIEWBOX}
          overflow="visible"
          aria-hidden
          pointerEvents="none"
        >
          <IconPaths stroke={`url(#${shineId})`} />
        </svg>

        <text
          x={TEXT_X}
          y={LINK_HEIGHT / 2}
          fill={`url(#${shineId})`}
          fontSize={TEXT_SIZE}
          fontWeight={600}
          dominantBaseline="central"
          className="font-semibold"
          pointerEvents="none"
          aria-hidden
        >
          {TEXT_LABEL}
        </text>
      </svg>
    </div>
  );
}
