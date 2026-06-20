import type { MutableRefObject } from "react";

export type BallBounds = { height: number; width: number };

export type Vec3 = { x: number; y: number; z: number };

export function angSpeed(angVel: Vec3): number {
  return Math.sqrt(angVel.x ** 2 + angVel.y ** 2 + angVel.z ** 2);
}

export type BallPhysicsRefs = {
  y: MutableRefObject<number>;
  vy: MutableRefObject<number>;
  angVel: MutableRefObject<Vec3>;
  rotation: MutableRefObject<Vec3>;
  bounds: MutableRefObject<BallBounds>;
  radius: number;
};
