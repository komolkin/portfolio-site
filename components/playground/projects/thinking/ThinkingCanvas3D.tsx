"use client";

import { Environment } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import { Euler, Quaternion, type Group, type MeshPhysicalMaterial } from "three";
import {
  applyPurpleRimGlow,
  type PurpleRimGlowUniforms,
} from "@/components/playground/projects/thinking/apply-purple-rim-glow";
import { createSphereTextureResource } from "@/components/playground/projects/thinking/create-smiley-texture";

const SPHERE_RADIUS = 24;

/** Equirect center (u=0.5) sits on +X; rotate so the face points at the +Z camera. */
const FACE_FORWARD_Y = -Math.PI / 2;

const BLINK_CLOSE_S = 0.075;
const BLINK_OPEN_S = 0.12;
const BLINK_IDLE_MIN_S = 2.4;
const BLINK_IDLE_MAX_S = 6.8;

/** Random idle yaw range (radians) and per-frame slerp factor. */
const LOOK_YAW_RANGE = 0.45;
const LOOK_SMOOTH = 0.06;
const LOOK_HOLD_MIN_S = 1.2;
const LOOK_HOLD_MAX_S = 3.0;

/** Head phases — `looking` does random L/R glances, `delay` holds at whatever
 * yaw the face was last at for 1s, and `spinning` runs a smooth eased full
 * 360° turn starting and ending at that same yaw. */
const LOOK_PHASE_MIN_S = 4.5;
const LOOK_PHASE_MAX_S = 7.0;
const PRE_SPIN_DELAY_S = 1.0;
const SPIN_DURATION_S = 1.6;

/** Rim-glow pulse — `uRimIntensity` oscillates between MIN and MAX with a
 * two-sine blend at different frequencies, so the rhythm feels organic. */
const GLOW_INTENSITY_MIN = 0.3;
const GLOW_INTENSITY_MAX = 2.2;
const GLOW_FREQ_PRIMARY = 0.3;
const GLOW_FREQ_SECONDARY = 0.13;

type BlinkPhase = "idle" | "closing" | "opening";
type HeadPhase = "looking" | "delay" | "spinning";

function easeIn(t: number): number {
  return t * t * t;
}

function easeOut(t: number): number {
  return 1 - (1 - t) ** 3;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
}

function nextLookPhaseDuration(): number {
  return (
    LOOK_PHASE_MIN_S + Math.random() * (LOOK_PHASE_MAX_S - LOOK_PHASE_MIN_S)
  );
}

function nextBlinkDelay(): number {
  return BLINK_IDLE_MIN_S + Math.random() * (BLINK_IDLE_MAX_S - BLINK_IDLE_MIN_S);
}

function nextLookHoldDelay(): number {
  return LOOK_HOLD_MIN_S + Math.random() * (LOOK_HOLD_MAX_S - LOOK_HOLD_MIN_S);
}

function nextLookYaw(prevYaw: number): number {
  /** Bias the new direction opposite the previous one so the face actually
   * swings side-to-side instead of nudging in the same direction. */
  const sign = prevYaw === 0 ? (Math.random() < 0.5 ? -1 : 1) : -Math.sign(prevYaw);
  const magnitude = 0.45 + Math.random() * 0.55;
  return sign * magnitude * LOOK_YAW_RANGE;
}

function SmileySphere() {
  const orientRef = useRef<Group>(null);
  const materialRef = useRef<MeshPhysicalMaterial>(null);
  const sphereTexture = useMemo(() => createSphereTextureResource(), []);
  const baseQuat = useMemo(
    () => new Quaternion().setFromEuler(new Euler(0, FACE_FORWARD_Y, 0)),
    [],
  );
  const yawQuat = useMemo(() => new Quaternion(), []);
  const targetQuat = useMemo(() => new Quaternion(), []);
  const yawEuler = useMemo(() => new Euler(0, 0, 0, "YXZ"), []);

  const blinkPhaseRef = useRef<BlinkPhase>("idle");
  const blinkAmountRef = useRef(0);
  const blinkPhaseStartRef = useRef(0);
  const nextBlinkAtRef = useRef(nextBlinkDelay());

  const currentYawRef = useRef(0);
  const yawTargetRef = useRef(0);
  const nextLookAtRef = useRef(nextLookHoldDelay());

  const headPhaseRef = useRef<HeadPhase>("looking");
  const headPhaseStartRef = useRef(0);
  const lookPhaseDurationRef = useRef(nextLookPhaseDuration());
  const spinDirectionRef = useRef<1 | -1>(1);
  const spinStartYawRef = useRef(0);

  const glowUniformsRef = useRef<PurpleRimGlowUniforms | null>(null);

  useLayoutEffect(() => {
    orientRef.current?.quaternion.copy(baseQuat);
    if (materialRef.current) {
      applyPurpleRimGlow(materialRef.current, (uniforms) => {
        glowUniformsRef.current = uniforms;
      });
    }
  }, [baseQuat]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;

    const orient = orientRef.current;
    if (orient) {
      let yawForFrame = currentYawRef.current;

      switch (headPhaseRef.current) {
        case "looking": {
          if (t >= nextLookAtRef.current) {
            yawTargetRef.current = nextLookYaw(yawTargetRef.current);
            nextLookAtRef.current = t + nextLookHoldDelay();
          }
          currentYawRef.current +=
            (yawTargetRef.current - currentYawRef.current) * LOOK_SMOOTH;
          yawForFrame = currentYawRef.current;

          if (t - headPhaseStartRef.current >= lookPhaseDurationRef.current) {
            spinStartYawRef.current = currentYawRef.current;
            yawTargetRef.current = currentYawRef.current;
            headPhaseRef.current = "delay";
            headPhaseStartRef.current = t;
          }
          break;
        }
        case "delay": {
          yawForFrame = spinStartYawRef.current;
          if (t - headPhaseStartRef.current >= PRE_SPIN_DELAY_S) {
            headPhaseRef.current = "spinning";
            headPhaseStartRef.current = t;
          }
          break;
        }
        case "spinning": {
          const progress = Math.min(
            1,
            (t - headPhaseStartRef.current) / SPIN_DURATION_S,
          );
          const eased = easeInOutCubic(progress);
          yawForFrame =
            spinStartYawRef.current +
            eased * Math.PI * 2 * spinDirectionRef.current;

          if (progress >= 1) {
            currentYawRef.current = spinStartYawRef.current;
            yawTargetRef.current = spinStartYawRef.current;
            yawForFrame = spinStartYawRef.current;
            spinDirectionRef.current = (spinDirectionRef.current * -1) as 1 | -1;
            lookPhaseDurationRef.current = nextLookPhaseDuration();
            nextLookAtRef.current = t + nextLookHoldDelay();
            headPhaseRef.current = "looking";
            headPhaseStartRef.current = t;
          }
          break;
        }
      }

      yawEuler.set(0, yawForFrame, 0);
      yawQuat.setFromEuler(yawEuler);
      targetQuat.copy(yawQuat).multiply(baseQuat);
      orient.quaternion.copy(targetQuat);
    }

    const glow = glowUniformsRef.current;
    if (glow) {
      const primary = Math.sin(t * GLOW_FREQ_PRIMARY * Math.PI * 2) * 0.6;
      const secondary = Math.sin(t * GLOW_FREQ_SECONDARY * Math.PI * 2) * 0.4;
      const norm = (primary + secondary + 1) * 0.5;
      glow.uRimIntensity.value =
        GLOW_INTENSITY_MIN + (GLOW_INTENSITY_MAX - GLOW_INTENSITY_MIN) * norm;
    }

    const phase = blinkPhaseRef.current;
    let blink = 0;

    if (phase === "idle") {
      if (t >= nextBlinkAtRef.current) {
        blinkPhaseRef.current = "closing";
        blinkPhaseStartRef.current = t;
      }
    } else if (phase === "closing") {
      const p = Math.min(1, (t - blinkPhaseStartRef.current) / BLINK_CLOSE_S);
      blink = easeIn(p);
      if (p >= 1) {
        blinkPhaseRef.current = "opening";
        blinkPhaseStartRef.current = t;
      }
    } else {
      const p = Math.min(1, (t - blinkPhaseStartRef.current) / BLINK_OPEN_S);
      blink = 1 - easeOut(p);
      if (p >= 1) {
        blinkPhaseRef.current = "idle";
        nextBlinkAtRef.current = t + nextBlinkDelay();
        blink = 0;
      }
    }

    if (blinkPhaseRef.current !== "idle" || blinkAmountRef.current !== blink) {
      blinkAmountRef.current = blink;
      sphereTexture.redraw(blink);
    }
  });

  return (
    <group ref={orientRef}>
      <mesh>
        <sphereGeometry args={[SPHERE_RADIUS, 48, 48]} />
        <meshPhysicalMaterial
          ref={materialRef}
          color="#ffffff"
          map={sphereTexture.bodyMap}
          emissive="#ffffff"
          emissiveMap={sphereTexture.emissiveMap}
          emissiveIntensity={0.62}
          roughness={0.88}
          metalness={0}
          envMapIntensity={0.04}
        />
      </mesh>
    </group>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.08} />
      <directionalLight position={[120, 180, 220]} intensity={0.28} />
      <directionalLight position={[-160, 80, 140]} intensity={0.05} />
      <pointLight position={[-90, 130, 110]} intensity={0.55} color="#9333ea" />
      <pointLight position={[0, 0, 260]} intensity={0.06} color="#ffffff" />

      <Suspense fallback={null}>
        <SmileySphere />
        <Environment preset="city" />
      </Suspense>
    </>
  );
}

type ThinkingCanvas3DProps = {
  width: number;
  height: number;
};

export default function ThinkingCanvas3D({ width, height }: ThinkingCanvas3DProps) {
  if (width <= 0 || height <= 0) return null;

  return (
    <Canvas
      className="absolute inset-0"
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 2]}
      style={{ background: "transparent" }}
      camera={{ position: [0, 0, 85], fov: 42, near: 0.1, far: 2000 }}
    >
      <Scene />
    </Canvas>
  );
}
