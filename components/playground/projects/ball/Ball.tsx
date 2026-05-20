"use client";

import NumberFlow from "@number-flow/react";
import { useCallback, useEffect, useRef, useState } from "react";

const BALL_RADIUS = 30;
const GRAVITY = 2650;
const FLAP_VELOCITY = -430;
const MAX_FALL_SPEED = 980;
const INITIAL_Y_RATIO = 0.38;
const MAX_DELTA_S = 1 / 30;

/** Soccer-ball-style bounce off the floor */
const RESTITUTION = 0.74;
const MIN_BOUNCE_SPEED = 95;
const SPIN_PER_IMPACT = 0.14;
const SPIN_DAMPING = 4.2;

type GamePhase = "playing" | "settling" | "over";

export default function Ball() {
  const areaRef = useRef<HTMLDivElement>(null);
  const ballRef = useRef<HTMLDivElement>(null);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<GamePhase>("playing");
  const [showGameOver, setShowGameOver] = useState(false);

  const yRef = useRef(0);
  const vyRef = useRef(0);
  const spinRef = useRef(0);
  const boundsRef = useRef({ height: 0 });
  const phaseRef = useRef<GamePhase>("playing");
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const syncBallTransform = useCallback(() => {
    const ball = ballRef.current;
    if (!ball) return;
    const vy = vyRef.current;
    const flightTilt = Math.max(-28, Math.min(62, vy * 0.045));
    const rotation = spinRef.current + flightTilt;
    ball.style.transform = `translate(-50%, ${yRef.current}px) rotate(${rotation}deg)`;
  }, []);

  const measure = useCallback(() => {
    const el = areaRef.current;
    if (!el) return;
    const { height } = el.getBoundingClientRect();
    boundsRef.current = { height };
    const floor = height - BALL_RADIUS * 2;
    if (yRef.current === 0 && height > 0) {
      yRef.current = height * INITIAL_Y_RATIO - BALL_RADIUS;
      yRef.current = Math.min(yRef.current, floor);
      syncBallTransform();
    }
  }, [syncBallTransform]);

  const resetGame = useCallback(() => {
    const { height } = boundsRef.current;
    const floor = height - BALL_RADIUS * 2;
    yRef.current = Math.min(height * INITIAL_Y_RATIO - BALL_RADIUS, floor);
    vyRef.current = 0;
    spinRef.current = 0;
    phaseRef.current = "playing";
    setPhase("playing");
    setShowGameOver(false);
    setScore(0);
    lastTimeRef.current = null;
    syncBallTransform();
  }, [syncBallTransform]);

  const flap = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    vyRef.current = FLAP_VELOCITY;
    setScore((s) => s + 1);
    syncBallTransform();
  }, [syncBallTransform]);

  const bounceOffFloor = useCallback((floor: number, impactSpeed: number) => {
    yRef.current = floor;
    spinRef.current += impactSpeed * SPIN_PER_IMPACT;

    if (impactSpeed >= MIN_BOUNCE_SPEED) {
      vyRef.current = -impactSpeed * RESTITUTION;
    } else {
      vyRef.current = 0;
      spinRef.current *= 0.6;
    }
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      if (phaseRef.current === "over") {
        resetGame();
        return;
      }
      flap();
    },
    [flap, resetGame]
  );

  useEffect(() => {
    measure();
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  useEffect(() => {
    const tick = (now: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = now;
      }
      const dt = Math.min((now - lastTimeRef.current) / 1000, MAX_DELTA_S);
      lastTimeRef.current = now;

      const { height } = boundsRef.current;
      const active = phaseRef.current === "playing" || phaseRef.current === "settling";

      if (height > 0 && active) {
        const floor = height - BALL_RADIUS * 2;
        const ceiling = 0;

        vyRef.current += GRAVITY * dt;
        if (phaseRef.current === "playing" && vyRef.current > MAX_FALL_SPEED) {
          vyRef.current = MAX_FALL_SPEED;
        }

        yRef.current += vyRef.current * dt;

        if (yRef.current <= ceiling) {
          yRef.current = ceiling;
          if (vyRef.current < 0) vyRef.current = 0;
        }

        if (yRef.current >= floor && vyRef.current >= 0) {
          const impact = vyRef.current;

          if (phaseRef.current === "playing") {
            phaseRef.current = "settling";
            setPhase("settling");
            setShowGameOver(true);
          }

          bounceOffFloor(floor, impact);

          if (
            phaseRef.current === "settling" &&
            Math.abs(vyRef.current) < MIN_BOUNCE_SPEED &&
            Math.abs(spinRef.current) < 8
          ) {
            vyRef.current = 0;
            spinRef.current *= 0.5;
            phaseRef.current = "over";
            setPhase("over");
          }
        }

        if (phaseRef.current === "settling") {
          spinRef.current *= Math.exp(-SPIN_DAMPING * dt);

          const onFloor = yRef.current >= floor - 0.5;
          if (onFloor && Math.abs(vyRef.current) < 1 && Math.abs(spinRef.current) < 8) {
            vyRef.current = 0;
            yRef.current = floor;
            spinRef.current = 0;
            phaseRef.current = "over";
            setPhase("over");
          }
        }
      }

      syncBallTransform();
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [syncBallTransform, bounceOffFloor]);

  return (
    <div
      ref={areaRef}
      className="relative h-full w-full max-w-lg cursor-pointer touch-none select-none"
      onPointerDown={handlePointerDown}
      role="button"
      tabIndex={0}
      aria-label={phase === "over" ? "Ball game — tap to restart" : "Ball game — tap to flap"}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          if (phaseRef.current === "over") resetGame();
          else flap();
        }
      }}
    >
      <div
        className="pointer-events-none absolute left-1/2 top-8 z-10 -translate-x-1/2 text-4xl font-light tabular-nums tracking-tight text-foreground"
        aria-live="polite"
      >
        <NumberFlow value={score} />
      </div>

      {showGameOver && (
        <p className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-sm text-muted-foreground">
          {phase === "over" ? "Tap to try" : "Game over"}
        </p>
      )}

      <div
        ref={ballRef}
        className="pointer-events-none absolute left-1/2 top-0 z-20 origin-center rounded-full border border-white/25 bg-white/[0.06] shadow-[0_0_32px_rgba(255,255,255,0.08)] will-change-transform"
        style={{
          width: BALL_RADIUS * 2,
          height: BALL_RADIUS * 2,
          transform: "translate(-50%, 0px)",
        }}
        aria-hidden
      />
    </div>
  );
}
