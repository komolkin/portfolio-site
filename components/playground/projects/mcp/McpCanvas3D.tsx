"use client";

import { Environment } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useLayoutEffect, useMemo, useRef, type MutableRefObject } from "react";
import { Euler, Quaternion, Vector3, type Group, type MeshPhysicalMaterial } from "three";
import { applyPurpleRimGlow } from "@/components/playground/projects/mcp/apply-purple-rim-glow";
import { createSphereTextureResource } from "@/components/playground/projects/mcp/create-smiley-texture";

const SPHERE_RADIUS = 24;

/** Equirect center (u=0.5) sits on +X; rotate so the face points at the +Z camera. */
const FACE_FORWARD_Y = -Math.PI / 2;

/** Cursor → 3D look target before normalize (higher = more turn range). */
const LOOK_X = 0.95;
const LOOK_Y = 0.75;
const LOOK_SMOOTH = 0.1;
const PRESS_SCALE = 0.92;
const SCALE_SMOOTH = 0.28;

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
  const { gl } = useThree();
  const orientRef = useRef<Group>(null);
  const materialRef = useRef<MeshPhysicalMaterial>(null);
  const sphereTexture = useMemo(() => createSphereTextureResource(), []);
  const baseQuat = useMemo(
    () => new Quaternion().setFromEuler(new Euler(0, FACE_FORWARD_Y, 0)),
    [],
  );
  const targetQuat = useMemo(() => new Quaternion(), []);
  const lookQuat = useMemo(() => new Quaternion(), []);
  const restForward = useMemo(() => new Vector3(0, 0, 1), []);
  const lookTarget = useMemo(() => new Vector3(), []);
  const pressedRef = useRef(false);
  const scaleRef = useRef(1);

  const blinkPhaseRef = useRef<BlinkPhase>("idle");
  const blinkAmountRef = useRef(0);
  const phaseStartRef = useRef(0);
  const nextBlinkAtRef = useRef(nextBlinkDelay());

  const setCanvasCursor = (cursor: string) => {
    gl.domElement.style.cursor = cursor;
  };

  useLayoutEffect(() => {
    orientRef.current?.quaternion.copy(baseQuat);
    if (materialRef.current) {
      applyPurpleRimGlow(materialRef.current);
    }
    return () => {
      gl.domElement.style.cursor = "";
    };
  }, [baseQuat, gl]);

  useFrame(({ clock }) => {
    const orient = orientRef.current;
    if (orient) {
      const { x, y } = pointer.current;
      lookTarget.set(x * LOOK_X, y * LOOK_Y, 1).normalize();
      lookQuat.setFromUnitVectors(restForward, lookTarget);
      targetQuat.copy(lookQuat).multiply(baseQuat);
      orient.quaternion.slerp(targetQuat, LOOK_SMOOTH);

      const targetScale = pressedRef.current ? PRESS_SCALE : 1;
      scaleRef.current += (targetScale - scaleRef.current) * SCALE_SMOOTH;
      orient.scale.setScalar(scaleRef.current);
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
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          setCanvasCursor("pointer");
        }}
        onPointerOut={() => {
          pressedRef.current = false;
          setCanvasCursor("");
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          pressedRef.current = true;
          gl.domElement.setPointerCapture(e.pointerId);
        }}
        onPointerUp={(e) => {
          pressedRef.current = false;
          if (gl.domElement.hasPointerCapture(e.pointerId)) {
            gl.domElement.releasePointerCapture(e.pointerId);
          }
        }}
      >
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

function Scene({ pointer }: { pointer: McpPointerRef }) {
  return (
    <>
      <ambientLight intensity={0.08} />
      <directionalLight position={[120, 180, 220]} intensity={0.28} />
      <directionalLight position={[-160, 80, 140]} intensity={0.05} />
      <pointLight position={[-90, 130, 110]} intensity={0.55} color="#9333ea" />
      <pointLight position={[0, 0, 260]} intensity={0.06} color="#ffffff" />

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
