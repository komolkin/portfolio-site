"use client";

import { useId } from "react";

/**
 * Figma frame "Link Container" (node 9543:4713):
 * https://www.figma.com/design/XSjBMcMS96jS8ntZIpMukQ/Ilya?node-id=9543-4713
 */
const REWARDS_COLOR = "#018CFE";
const SHINE_GRADIENT =
  "linear-gradient(110deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0) 100%)";
const BASE_GRADIENT = `linear-gradient(${REWARDS_COLOR}, ${REWARDS_COLOR})`;

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
const SHINE_BAND = 40 * (VIEW_W / ICON_SIZE);
const SHINE_START = -60 * (VIEW_W / ICON_SIZE);
const SHINE_END = 160 * (VIEW_W / ICON_SIZE);

export default function Rewards() {
  const uid = useId().replace(/:/g, "");
  const iconShineId = `rewards-icon-shine-${uid}`;

  return (
    <div className="relative flex items-center justify-center p-4">
      <span className="rewardsLink inline-flex items-center gap-1.5">
        <svg
          className="block shrink-0 overflow-visible"
          style={{ width: ICON_SIZE, height: "auto" }}
          viewBox={`${VIEW_X} ${VIEW_Y} ${VIEW_W} ${VIEW_H}`}
          fill="none"
          aria-hidden
        >
          <defs>
            <linearGradient
              id={iconShineId}
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
                dur="3.5s"
                repeatCount="indefinite"
                calcMode="spline"
                keySplines="0.65 0 0.35 1; 0.65 0 0.35 1"
              />
            </linearGradient>
          </defs>

          <path d={ICON_PATH} stroke={REWARDS_COLOR} strokeWidth="1.5" fill="none" />
          <path
            d={CHEVRON_PATH}
            stroke={REWARDS_COLOR}
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
          <path d={ICON_PATH} stroke={`url(#${iconShineId})`} strokeWidth="1.5" fill="none" />
          <path
            d={CHEVRON_PATH}
            stroke={`url(#${iconShineId})`}
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
        </svg>

        <span className="rewardsText rewardsShineLayer text-base font-semibold leading-[1.25]">
          Rewards
        </span>
      </span>

      <style jsx global>{`
        @property --shine-x {
          syntax: "<length>";
          inherits: true;
          initial-value: -60px;
        }
      `}</style>

      <style jsx>{`
        .rewardsLink {
          --shine-x: -60px;
          --text-offset: ${ICON_SIZE + ICON_GAP}px;
          animation: rewards-unified-shine 3.5s cubic-bezier(0.65, 0, 0.35, 1) infinite;
        }

        .rewardsShineLayer {
          background-image: ${SHINE_GRADIENT}, ${BASE_GRADIENT};
          background-size: 40px 100%, 100% 100%;
          background-repeat: no-repeat;
          background-position: var(--shine-x) 0, 0 0;
        }

        .rewardsText {
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
          background-position: calc(var(--shine-x) - var(--text-offset)) 0, 0 0;
        }

        @keyframes rewards-unified-shine {
          0% {
            --shine-x: -60px;
          }
          50%,
          100% {
            --shine-x: 160px;
          }
        }
      `}</style>
    </div>
  );
}
