import type { Vec3 } from "@/components/playground/projects/ball/ball-physics";

const IMPACT_SPIN = 0.0014;

/** Impart 3D tumble from surface impacts (rad/s) */
export function addImpactSpin(angVel: Vec3, impact: number, surface: "floor" | "ceiling") {
  const s = impact * IMPACT_SPIN;
  const rx = (Math.random() - 0.5) * 2;
  const ry = (Math.random() - 0.5) * 2;
  const rz = (Math.random() - 0.5) * 2;

  if (surface === "floor") {
    angVel.x += s * (2.4 + rx * 0.6);
    angVel.y += s * ry * 1.5;
    angVel.z += s * rz * 1.7;
  } else {
    angVel.x -= s * (2.1 + rx * 0.5);
    angVel.y += s * ry * 1.4;
    angVel.z += s * rz * 1.5;
  }
}

/** Small kick on flap so the ball tumbles in all axes */
export function addFlapSpin(angVel: Vec3, flapCount: number) {
  const sign = flapCount % 2 === 0 ? 1 : -1;
  angVel.x += sign * (2.2 + Math.random() * 1.2);
  angVel.y += (Math.random() - 0.5) * 3.2;
  angVel.z += (Math.random() - 0.5) * 2.8;
}

export function integrateRotation(rotation: Vec3, angVel: Vec3, dt: number) {
  rotation.x += angVel.x * dt;
  rotation.y += angVel.y * dt;
  rotation.z += angVel.z * dt;
}

export function dampAngularVelocity(angVel: Vec3, dt: number, rate: number) {
  const factor = Math.exp(-rate * dt);
  angVel.x *= factor;
  angVel.y *= factor;
  angVel.z *= factor;
}
