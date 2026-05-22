"use client";

import { Environment } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useLayoutEffect, useMemo, useRef, type MutableRefObject } from "react";
import { Euler, Quaternion, Vector3, type Group } from "three";
import { createSphereTextureResource } from "@/components/playground/projects/mcp/create-smiley-texture";

const SPHERE_RADIUS = 24;

/** Equirect center (u=0.5) sits on +X; rotate so the face points at the +Z camera. */
const FACE_FORWARD_Y = -Math.PI / 2;

/** Cursor → 3D look target before normalize (higher = more turn range). */
const LOOK_X = 0.95;
const LOOK_Y = 0.75;
const LOOK_SMOOTH = 0.1;

const BLINK_CLOSE_S = 0.075;
const BLINK_OPEN_S = 0.12;
const BLINK_IDLE_MIN_S = 2.4;
const BLINK_IDLE_MAX_S = 6.8;

type BlinkPhase = "idle" | "closing" | "opening";

export type McpPointerRef = MutableRefObject<{ x: number; y: number }>;

function easeIn(t: number): number {
  return t * t * t;
}

function easeOut(t: number): number {
  return 1 - (1 - t) ** 3;
}

function nextBlinkDelay(): number {
  return BLINK_IDLE_MIN_S + Math.random() * (BLINK_IDLE_MAX_S - BLINK_IDLE_MIN_S);
}

function SmileySphere({ pointer }: { pointer: McpPointerRef }) {
  const orientRef = useRef<Group>(null);
  const sphereTexture = useMemo(() => createSphereTextureResource(), []);
  const baseQuat = useMemo(
    () => new Quaternion().setFromEuler(new Euler(0, FACE_FORWARD_Y, 0)),
    [],
  );
  const targetQuat = useMemo(() => new Quaternion(), []);
  const lookQuat = useMemo(() => new Quaternion(), []);
  const restForward = useMemo(() => new Vector3(0, 0, 1), []);
  const lookTarget = useMemo(() => new Vector3(), []);

  const blinkPhaseRef = useRef<BlinkPhase>("idle");
  const blinkAmountRef = useRef(0);
  const phaseStartRef = useRef(0);
  const nextBlinkAtRef = useRef(nextBlinkDelay());

  useLayoutEffect(() => {
    orientRef.current?.quaternion.copy(baseQuat);
  }, [baseQuat]);

  useFrame(({ clock }) => {
    const orient = orientRef.current;
    if (orient) {
      const { x, y } = pointer.current;
      lookTarget.set(x * LOOK_X, y * LOOK_Y, 1).normalize();
      lookQuat.setFromUnitVectors(restForward, lookTarget);
      targetQuat.copy(lookQuat).multiply(baseQuat);
      orient.quaternion.slerp(targetQuat, LOOK_SMOOTH);
    }

    const t = clock.elapsedTime;
    const phase = blinkPhaseRef.current;
    let blink = 0;

    if (phase === "idle") {
      if (t >= nextBlinkAtRef.current) {
        blinkPhaseRef.current = "closing";
        phaseStartRef.current = t;
      }
    } else if (phase === "closing") {
      const p = Math.min(1, (t - phaseStartRef.current) / BLINK_CLOSE_S);
      blink = easeIn(p);
      if (p >= 1) {
        blinkPhaseRef.current = "opening";
        phaseStartRef.current = t;
      }
    } else {
      const p = Math.min(1, (t - phaseStartRef.current) / BLINK_OPEN_S);
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
          map={sphereTexture.texture}
          emissive="#ffffff"
          emissiveMap={sphereTexture.texture}
          emissiveIntensity={0.55}
          roughness={0.62}
          metalness={0.04}
          envMapIntensity={0.35}
        />
      </mesh>
    </group>
  );
}

function Scene({ pointer }: { pointer: McpPointerRef }) {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[120, 180, 220]} intensity={1.1} />
      <directionalLight position={[-160, 80, 140]} intensity={0.28} />
      <pointLight position={[0, 0, 260]} intensity={0.45} color="#ffffff" />

      <Suspense fallback={null}>
        <SmileySphere pointer={pointer} />
        <Environment preset="city" />
      </Suspense>
    </>
  );
}

type McpCanvas3DProps = {
  pointer: McpPointerRef;
  width: number;
  height: number;
};

export default function McpCanvas3D({ pointer, width, height }: McpCanvas3DProps) {
  if (width <= 0 || height <= 0) return null;

  return (
    <Canvas
      className="absolute inset-0"
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 2]}
      style={{ background: "transparent" }}
      camera={{ position: [0, 0, 420], fov: 42, near: 0.1, far: 2000 }}
    >
      <Scene pointer={pointer} />
    </Canvas>
  );
}
