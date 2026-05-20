"use client";

import { ContactShadows, Environment, OrthographicCamera, useTexture } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import type { Mesh } from "three";
import type { BallPhysicsRefs } from "@/components/playground/projects/ball/ball-physics";

/** Equirectangular 2:1 — correct aspect for sphere UV mapping */
const SOCCER_TEXTURE = "/playground/ball/soccer-equirect.png";

function BallMesh({ physics }: { physics: BallPhysicsRefs }) {
  const meshRef = useRef<Mesh>(null);
  const texture = useTexture(SOCCER_TEXTURE);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const { height } = physics.bounds.current;
    if (height <= 0) return;

    const centerY = physics.y.current + physics.radius;
    mesh.position.set(0, height / 2 - centerY, 0);

    const { x, y, z } = physics.rotation.current;
    mesh.rotation.set(x, y, z);
  });

  return (
    <mesh ref={meshRef} castShadow receiveShadow>
      <sphereGeometry args={[physics.radius, 64, 64]} />
      <meshPhysicalMaterial
        map={texture}
        roughness={0.48}
        metalness={0.02}
        clearcoat={0.12}
        clearcoatRoughness={0.45}
        envMapIntensity={0.9}
      />
    </mesh>
  );
}

function Scene({
  physics,
  floorY,
  ready,
  playWidth,
}: {
  physics: BallPhysicsRefs;
  floorY: number;
  ready: boolean;
  playWidth: number;
}) {
  return (
    <>
      <ambientLight intensity={0.42} />
      <directionalLight
        position={[140, 220, 260]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-180, 120, 140]} intensity={0.38} />
      <pointLight position={[0, 120, 180]} intensity={0.3} />

      <Suspense fallback={null}>
        <BallMesh physics={physics} />
        <Environment preset="city" />
      </Suspense>

      {ready && (
        <>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, floorY - 0.5, 0]}
            receiveShadow
          >
            <planeGeometry args={[playWidth * 1.2, physics.radius * 6]} />
            <shadowMaterial transparent opacity={0.32} />
          </mesh>
          <ContactShadows
            position={[0, floorY, 0]}
            opacity={0.65}
            scale={physics.radius * 3.5}
            blur={2.8}
            far={physics.radius * 2.2}
            resolution={512}
          />
        </>
      )}
    </>
  );
}

type BallCanvas3DProps = {
  physics: BallPhysicsRefs;
  width: number;
  height: number;
};

export default function BallCanvas3D({ physics, width, height }: BallCanvas3DProps) {
  if (width <= 0 || height <= 0) return null;

  const halfW = width / 2;
  const halfH = height / 2;
  const floorY = halfH - (height - physics.radius);

  return (
    <Canvas
      className="pointer-events-none absolute inset-0 z-20"
      gl={{ alpha: true, antialias: true }}
      shadows
      dpr={[1, 2]}
      style={{ background: "transparent" }}
    >
      <OrthographicCamera
        makeDefault
        position={[0, 0, 500]}
        left={-halfW}
        right={halfW}
        top={halfH}
        bottom={-halfH}
        near={0.1}
        far={2000}
      />
      <Scene
        physics={physics}
        floorY={floorY}
        ready={height > 0}
        playWidth={width}
      />
    </Canvas>
  );
}
