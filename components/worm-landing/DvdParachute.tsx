"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";

/** DVD-style bouncing airdrop parachute (waitlist /app chrome). */
export default function DvdParachute() {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const state = useRef({
    x: 64,
    y: 120,
    vx: 2.1,
    vy: 1.75,
    swing: 0,
  });

  useEffect(() => {
    const el = ref.current;
    const img = imgRef.current;
    if (!el || !img) return;

    const size = () => {
      const width = el.offsetWidth || 118;
      const height = el.offsetHeight || 118;
      return { w: width, h: height };
    };

    const bounds = () => {
      const { w, h } = size();
      const root = (el.parentElement ?? el.offsetParent) as HTMLElement | null;
      const maxX = Math.max(0, (root?.clientWidth ?? window.innerWidth) - w);
      const maxY = Math.max(0, (root?.clientHeight ?? window.innerHeight) - h);
      return { maxX, maxY };
    };

    let { maxX, maxY } = bounds();
    const speed = reduceMotion ? 0.7 : 2.1;
    state.current = {
      x: Math.random() * maxX,
      y: Math.random() * maxY,
      vx: (Math.random() > 0.5 ? 1 : -1) * speed,
      vy: (Math.random() > 0.5 ? 1 : -1) * (speed * 0.85),
      swing: 0,
    };
    el.style.transform = `translate3d(${state.current.x}px, ${state.current.y}px, 0)`;

    let raf = 0;
    const tick = (now: number) => {
      ({ maxX, maxY } = bounds());
      let { x, y, vx, vy, swing } = state.current;
      x += vx;
      y += vy;
      if (x <= 0) {
        x = 0;
        vx = Math.abs(vx);
      } else if (x >= maxX) {
        x = maxX;
        vx = -Math.abs(vx);
      }
      if (y <= 0) {
        y = 0;
        vy = Math.abs(vy);
      } else if (y >= maxY) {
        y = maxY;
        vy = -Math.abs(vy);
      }
      // Slow hang from the canopy. Wide enough that the crate actually travels.
      const sway = Math.sin(now / 1300) * (reduceMotion ? 8 : 14);
      swing += (sway - swing) * 0.08;
      img.style.transformOrigin = "50% 8%";
      img.style.transform = `rotate(${swing.toFixed(2)}deg)`;
      state.current = { x, y, vx, vy, swing };
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);

    const onResize = () => {
      ({ maxX, maxY } = bounds());
      state.current.x = Math.min(state.current.x, maxX);
      state.current.y = Math.min(state.current.y, maxY);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [reduceMotion]);

  return (
    <span
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 z-[40] will-change-transform"
    >
      <img
        ref={imgRef}
        src="/worm/parachute.png"
        alt=""
        width={840}
        height={991}
        draggable={false}
        className="pointer-events-none h-auto w-[110px] select-none will-change-transform sm:w-[128px]"
      />
    </span>
  );
}
