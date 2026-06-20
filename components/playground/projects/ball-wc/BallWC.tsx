"use client";

import NumberFlow from "@number-flow/react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  angSpeed,
  type BallPhysicsRefs,
  type Vec3,
} from "@/components/playground/projects/ball-wc/ball-wc-physics";
import {
  addFlapSpin,
  addImpactSpin,
  dampAngularVelocity,
  integrateRotation,
} from "@/components/playground/projects/ball-wc/ball-wc-spin";
import { playTapBounceSound, resumeBallWCAudio } from "@/components/playground/projects/ball-wc/ball-wc-sound";

const BallWCCanvas3D = dynamic(
  () => import("@/components/playground/projects/ball-wc/BallWCCanvas3D"),
  { ssr: false }
);

const BALL_RADIUS = 80;
const GRAVITY = 2650;
const FLAP_VELOCITY = -860;
const MAX_FALL_SPEED = 980;
const INITIAL_Y_RATIO = 0.38;
const MAX_DELTA_S = 1 / 30;

const RESTITUTION = 0.74;
const MIN_BOUNCE_SPEED = 95;
const ANG_DAMP_AIR = 0.2;
const ANG_DAMP_SETTLE = 3.8;
const REST_ANG_SPEED = 0.65;
const INITIAL_SCORE = 0;

type GamePhase = "playing" | "settling" | "over";

const zeroVec = (): Vec3 => ({ x: 0, y: 0, z: 0 });

export default function BallWC() {
  const areaRef = useRef<HTMLDivElement>(null);
  const [score, setScore] = useState(INITIAL_SCORE);
  const [phase, setPhase] = useState<GamePhase>("playing");
  const [showGameOver, setShowGameOver] = useState(false);
  const [areaSize, setAreaSize] = useState({ width: 0, height: 0 });

  const yRef = useRef(0);
  const vyRef = useRef(0);
  const angVelRef = useRef<Vec3>(zeroVec());
  const rotationRef = useRef<Vec3>(zeroVec());
  const boundsRef = useRef({ height: 0, width: 0 });
  const phaseRef = useRef<GamePhase>("playing");
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const physics = useMemo<BallPhysicsRefs>(
    () => ({
      y: yRef,
      vy: vyRef,
      angVel: angVelRef,
      rotation: rotationRef,
      bounds: boundsRef,
      radius: BALL_RADIUS,
    }),
    []
  );

  const measure = useCallback(() => {
    const el = areaRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    boundsRef.current = { width, height };
    setAreaSize({ width, height });
    const floor = height - BALL_RADIUS * 2;
    if (yRef.current === 0 && height > 0) {
      yRef.current = height * INITIAL_Y_RATIO - BALL_RADIUS;
      yRef.current = Math.min(yRef.current, floor);
    }
  }, []);

  const resetGame = useCallback(() => {
    const { height } = boundsRef.current;
    const floor = height - BALL_RADIUS * 2;
    yRef.current = Math.min(height * INITIAL_Y_RATIO - BALL_RADIUS, floor);
    vyRef.current = 0;
    angVelRef.current = zeroVec();
    rotationRef.current = zeroVec();
    phaseRef.current = "playing";
    setPhase("playing");
    setShowGameOver(false);
    setScore(INITIAL_SCORE);
    lastTimeRef.current = null;
  }, []);

  const flap = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    playTapBounceSound();
    vyRef.current = FLAP_VELOCITY;
    setScore((s) => {
      addFlapSpin(angVelRef.current, s + 1);
      return s + 1;
    });
  }, []);

  const startSettling = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    phaseRef.current = "settling";
    setPhase("settling");
    setShowGameOver(true);
  }, []);

  const bounceOffFloor = useCallback((floor: number, impactSpeed: number) => {
    yRef.current = floor;
    addImpactSpin(angVelRef.current, impactSpeed, "floor");

    if (impactSpeed >= MIN_BOUNCE_SPEED) {
      vyRef.current = -impactSpeed * RESTITUTION;
    } else {
      vyRef.current = 0;
      angVelRef.current.x *= 0.55;
      angVelRef.current.y *= 0.55;
      angVelRef.current.z *= 0.55;
    }
  }, []);

  const bounceOffCeiling = useCallback((ceiling: number, impactSpeed: number) => {
    yRef.current = ceiling;
    addImpactSpin(angVelRef.current, impactSpeed, "ceiling");

    if (impactSpeed >= MIN_BOUNCE_SPEED) {
      vyRef.current = impactSpeed * RESTITUTION;
    } else {
      vyRef.current = 0;
      angVelRef.current.x *= 0.55;
      angVelRef.current.y *= 0.55;
      angVelRef.current.z *= 0.55;
    }
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      void resumeBallWCAudio();
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

        integrateRotation(rotationRef.current, angVelRef.current, dt);
        dampAngularVelocity(
          angVelRef.current,
          dt,
          phaseRef.current === "settling" ? ANG_DAMP_SETTLE : ANG_DAMP_AIR
        );

        if (yRef.current <= ceiling && vyRef.current < 0) {
          const impact = -vyRef.current;
          if (phaseRef.current === "playing") startSettling();
          bounceOffCeiling(ceiling, impact);
        }

        if (yRef.current >= floor && vyRef.current >= 0) {
          const impact = vyRef.current;
          if (phaseRef.current === "playing") startSettling();
          bounceOffFloor(floor, impact);

          if (
            phaseRef.current === "settling" &&
            Math.abs(vyRef.current) < MIN_BOUNCE_SPEED &&
            angSpeed(angVelRef.current) < REST_ANG_SPEED
          ) {
            vyRef.current = 0;
            angVelRef.current = zeroVec();
            phaseRef.current = "over";
            setPhase("over");
          }
        }

        if (phaseRef.current === "settling") {
          const onFloor = yRef.current >= floor - 0.5;
          if (
            onFloor &&
            Math.abs(vyRef.current) < 1 &&
            angSpeed(angVelRef.current) < REST_ANG_SPEED
          ) {
            vyRef.current = 0;
            yRef.current = floor;
            angVelRef.current = zeroVec();
            phaseRef.current = "over";
            setPhase("over");
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [bounceOffFloor, bounceOffCeiling, startSettling]);

  return (
    <div
      ref={areaRef}
      className="relative h-full w-full max-w-lg cursor-pointer touch-none select-none"
      onPointerDown={handlePointerDown}
      role="button"
      tabIndex={0}
      aria-label={phase === "over" ? "Ball WC game — tap to restart" : "Ball WC game — tap to flap"}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          void resumeBallWCAudio();
          if (phaseRef.current === "over") resetGame();
          else flap();
        }
      }}
    >
      <BallWCCanvas3D physics={physics} width={areaSize.width} height={areaSize.height} />

      <div
        className="pointer-events-none absolute left-1/2 top-[22%] z-10 -translate-x-1/2 text-[6.75rem] leading-none font-light tabular-nums tracking-tight text-foreground"
        aria-live="polite"
      >
        <NumberFlow value={score} format={{ useGrouping: true }} />
      </div>

      {showGameOver && (
        <p className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-sm text-muted-foreground">
          {phase === "over" ? "Tap to try" : "Game over"}
        </p>
      )}
    </div>
  );
}
