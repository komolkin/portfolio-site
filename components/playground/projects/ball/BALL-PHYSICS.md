# Ball — Physics Parameters

Reference for porting or tuning the playground **Ball** mini-game. Values are taken from `Ball.tsx`, `ball-spin.ts`, and `ball-physics.ts`.

**Units:** screen space — **pixels** and **seconds** (not meters). When rescaling the play area, preserve ratios (gravity vs flap vs bounce) rather than copying absolute numbers blindly.

---

## Core simulation (`Ball.tsx`)

| Parameter | Value | Notes |
|-----------|-------|--------|
| `BALL_RADIUS` | `40` | px; collision bounds and 3D sphere radius |
| `GRAVITY` | `2650` | px/s² — `vy += GRAVITY * dt` each frame |
| `FLAP_VELOCITY` | `-860` | px/s upward impulse on tap |
| `MAX_FALL_SPEED` | `980` | px/s terminal velocity cap (only while `playing`) |
| `INITIAL_Y_RATIO` | `0.38` | spawn: `y = height * ratio - radius`, clamped to floor |
| `MAX_DELTA_S` | `1/30` (~0.0333 s) | max timestep per frame |

### Bounce / restitution

| Parameter | Value | Notes |
|-----------|-------|--------|
| `RESTITUTION` | `0.74` | floor: `vy = -impact * RESTITUTION`; ceiling: `vy = impact * RESTITUTION` |
| `MIN_BOUNCE_SPEED` | `95` | px/s; below this, no bounce — `vy = 0`, spin × `0.55` |
| Low-impact spin damp | `0.55` | multiplier on `angVel` x/y/z when impact &lt; `MIN_BOUNCE_SPEED` |

### Angular damping & settle

| Parameter | Value | Notes |
|-----------|-------|--------|
| `ANG_DAMP_AIR` | `0.2` | exponential damping rate while `playing` |
| `ANG_DAMP_SETTLE` | `3.8` | exponential damping rate while `settling` |
| `REST_ANG_SPEED` | `0.65` | rad/s; below this (+ low `vy`) → phase `over` |

Damping formula (per axis): `angVel *= exp(-rate * dt)`.

---

## Bounds & coordinates

- **Ceiling:** `y = 0`
- **Floor:** `y = height - BALL_RADIUS * 2` (ball top edge; full diameter inset from bottom)
- **Position `y`:** top edge of the ball in 2D play space (render center: `y + radius`)
- **Integration:** `y += vy * dt`; gravity affects `vy` only (1D vertical arcade physics)

---

## Rotation / spin (`ball-spin.ts`)

| Parameter | Value |
|-----------|-------|
| `IMPACT_SPIN` | `0.0014` | scales impact speed → angular velocity (rad/s) |

### Impact spin (floor / ceiling)

On collision, `s = impact * IMPACT_SPIN`, with `rx`, `ry`, `rz` each in `[-1, 1]` (random).

**Floor:**

- `angVel.x += s * (2.4 + rx * 0.6)`
- `angVel.y += s * ry * 1.5`
- `angVel.z += s * rz * 1.7`

**Ceiling:**

- `angVel.x -= s * (2.1 + rx * 0.5)`
- `angVel.y += s * ry * 1.4`
- `angVel.z += s * rz * 1.5`

### Flap spin (each tap)

- `sign = flapCount % 2 === 0 ? 1 : -1`
- `angVel.x += sign * (2.2 + random * 1.2)`
- `angVel.y += (random - 0.5) * 3.2`
- `angVel.z += (random - 0.5) * 2.8`

### Rotation integration

- `rotation.x += angVel.x * dt`
- `rotation.y += angVel.y * dt`
- `rotation.z += angVel.z * dt`

Angular speed helper: `sqrt(x² + y² + z²)`.

---

## Game phases (physics-related)

| Phase | Behavior |
|-------|----------|
| `playing` | Flap enabled; `MAX_FALL_SPEED` cap; `ANG_DAMP_AIR` |
| `settling` | First wall hit triggers this; stronger `ANG_DAMP_SETTLE`; bounces continue |
| `over` | Motion stopped; tap resets position, velocity, spin, score |

**End conditions (`settling` → `over`):**

1. On floor, `|vy| < MIN_BOUNCE_SPEED` and angular speed &lt; `REST_ANG_SPEED`
2. On floor (`y >= floor - 0.5`), `|vy| < 1` and angular speed &lt; `REST_ANG_SPEED`

---

## 3D render (`BallCanvas3D.tsx`)

Linked to the same physics refs (not a separate simulation).

| Item | Value |
|------|--------|
| Sphere radius | `physics.radius` (40) |
| Sphere segments | `64 × 64` |
| World position | `(0, height/2 - (y + radius), 0)` |
| World rotation | Euler radians from `rotation` ref |

**Material (visual only):** roughness `0.48`, metalness `0.02`, clearcoat `0.12`, clearcoatRoughness `0.45`, envMapIntensity `0.9`.

---

## Copy-paste constants

```ts
// Ball.tsx — linear motion
const BALL_RADIUS = 40;
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
const LOW_IMPACT_SPIN_DAMP = 0.55;

// ball-spin.ts
const IMPACT_SPIN = 0.0014;
// flap: x += sign * (2.2..3.4), y ± 1.6, z ± 1.4 (rad/s kicks)
```

---

## Source files

- `components/playground/projects/ball/Ball.tsx` — main loop, bounce, phases
- `components/playground/projects/ball/ball-spin.ts` — angular velocity & rotation
- `components/playground/projects/ball/ball-physics.ts` — types and `angSpeed` helper
- `components/playground/projects/ball/BallCanvas3D.tsx` — Three.js presentation
