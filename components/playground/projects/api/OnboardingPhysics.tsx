"use client";

import { useEffect, useRef } from "react";
import {
  Bodies,
  Body,
  Common,
  Constraint,
  Engine,
  Query,
  World,
  type Constraint as MatterConstraint,
} from "matter-js";

type PieceDef = {
  id: string;
  src: string;
  /** Intrinsic width / height of the PNG. */
  aspect: number;
  restX: number;
  restY: number;
  angle: number;
  density?: number;
};

/**
 * Longer edge as a fraction of frame width so every glyph reads the same
 * optical size regardless of aspect ratio.
 */
const PIECE_SIZE_RATIO = 0.36;
/** Hold at the top before the first piece drops. */
const DROP_DELAY_MS = 750;
/** Extra wait between each piece releasing. */
const DROP_STAGGER_MS = 85;

/** Layout tuned to Figma 360×740 onboarding hero. W falls with the rest. */
const PIECES: PieceDef[] = [
  {
    id: "logo-w",
    src: "/worm-app/physics/logo-w.png",
    aspect: 215 / 158,
    restX: 0.5,
    restY: 0.36,
    angle: 0,
    density: 0.0042,
  },
  {
    id: "football",
    src: "/worm-app/physics/piece-football.png",
    aspect: 228 / 135,
    restX: 0.2,
    restY: 0.88,
    angle: -0.22,
  },
  {
    id: "alien",
    src: "/worm-app/physics/piece-alien.png",
    aspect: 135 / 189,
    restX: 0.28,
    restY: 0.66,
    angle: 0.2,
  },
  {
    id: "gold-e",
    src: "/worm-app/physics/piece-gold-e.png",
    aspect: 159 / 175,
    restX: 0.5,
    restY: 0.86,
    angle: -0.08,
  },
  {
    id: "tennis",
    src: "/worm-app/physics/piece-tennis.png",
    aspect: 163 / 164,
    restX: 0.76,
    restY: 0.7,
    angle: 0.16,
  },
  {
    id: "golf",
    src: "/worm-app/physics/piece-golf.png",
    aspect: 183 / 200,
    restX: 0.82,
    restY: 0.52,
    angle: -0.1,
  },
  {
    id: "flag-r",
    src: "/worm-app/physics/piece-flag-r.png",
    aspect: 129 / 158,
    restX: 0.16,
    restY: 0.5,
    angle: -0.28,
  },
  {
    id: "marble-n",
    src: "/worm-app/physics/piece-marble-n.png",
    aspect: 143 / 169,
    restX: 0.8,
    restY: 0.88,
    angle: 0.28,
  },
  {
    id: "arrow",
    src: "/worm-app/physics/piece-arrow.png",
    aspect: 147 / 182,
    restX: 0.14,
    restY: 0.74,
    angle: 0.1,
  },
  {
    id: "crystal-a",
    src: "/worm-app/physics/piece-crystal-a.png",
    aspect: 134 / 166,
    restX: 0.62,
    restY: 0.6,
    angle: -0.16,
  },
  {
    id: "cash",
    src: "/worm-app/physics/piece-cash.png",
    aspect: 180 / 145,
    restX: 0.38,
    restY: 0.78,
    angle: 0.18,
  },
  {
    id: "soccer",
    src: "/worm-app/physics/piece-soccer.png",
    aspect: 158 / 158,
    restX: 0.66,
    restY: 0.78,
    angle: -0.12,
  },
];

type PieceRuntime = {
  body: Body;
  el: HTMLElement;
  width: number;
  height: number;
};

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function OnboardingPhysics() {
  const rootRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const layer = layerRef.current;
    if (!root || !layer) return;

    const reduced = prefersReducedMotion();
    const pieceEls = new Map<string, HTMLElement>();
    for (const piece of PIECES) {
      const el = layer.querySelector<HTMLElement>(`[data-piece="${piece.id}"]`);
      if (el) pieceEls.set(piece.id, el);
    }

    const engine = Engine.create({
      gravity: { x: 0, y: reduced ? 0 : 1.15, scale: 0.001 },
    });

    root.style.touchAction = "none";
    root.style.cursor = "grab";

    let walls: Body[] = [];
    let runtimes: PieceRuntime[] = [];
    let raf = 0;
    let alive = true;
    let motionAttached = false;
    let lastW = 0;
    let lastH = 0;
    let resizeTimer = 0;
    let builtOnce = false;
    let introDropActive = false;
    let dropTimers: number[] = [];
    let dragConstraint: MatterConstraint | null = null;
    let dragBody: Body | null = null;
    let dragPointerId: number | null = null;
    let lastDrag = { x: 0, y: 0, t: 0 };
    let dragVelocity = { x: 0, y: 0 };

    const clearDropTimers = () => {
      for (const id of dropTimers) window.clearTimeout(id);
      dropTimers = [];
    };

    const syncSprites = () => {
      for (const item of runtimes) {
        const { body, el, width, height } = item;
        el.style.transform = `translate3d(${body.position.x - width / 2}px, ${body.position.y - height / 2}px, 0) rotate(${body.angle}rad)`;
      }
    };

    /** Map client coords into Matter world space (handles CSS zoom). */
    const toWorld = (clientX: number, clientY: number) => {
      const rect = root.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
      return {
        x: ((clientX - rect.left) / rect.width) * root.clientWidth,
        y: ((clientY - rect.top) / rect.height) * root.clientHeight,
      };
    };

    const clearDynamic = () => {
      endDrag();
      clearDropTimers();
      if (walls.length) World.remove(engine.world, walls);
      if (runtimes.length) {
        World.remove(
          engine.world,
          runtimes.map((item) => item.body),
        );
      }
      walls = [];
      runtimes = [];
    };

    const endDrag = () => {
      if (dragConstraint) {
        World.remove(engine.world, dragConstraint);
        dragConstraint = null;
      }
      if (dragBody) {
        Body.setVelocity(dragBody, {
          x: Common.clamp(dragVelocity.x * 1.35, -28, 28),
          y: Common.clamp(dragVelocity.y * 1.35, -28, 28),
        });
        Body.setAngularVelocity(
          dragBody,
          Common.clamp(dragBody.angularVelocity + dragVelocity.x * 0.01, -0.35, 0.35),
        );
        dragBody.collisionFilter.mask = 0xffffffff;
        dragBody = null;
      }
      dragPointerId = null;
      dragVelocity = { x: 0, y: 0 };
      root.style.cursor = "grab";
    };

    const build = (dropIn: boolean) => {
      if (!alive) return false;
      // clientWidth/Height match the Matter world + CSS zoom better than rect.
      const width = root.clientWidth;
      const height = root.clientHeight;
      if (width < 40 || height < 40) return false;

      clearDynamic();
      introDropActive = false;

      const thickness = 96;
      const dropping = dropIn && !reduced;
      walls = [
        Bodies.rectangle(width / 2, height + thickness / 2 - 4, width * 1.6, thickness, {
          isStatic: true,
          friction: 0.95,
          restitution: 0.12,
        }),
        Bodies.rectangle(-thickness / 2, height / 2, thickness, height * 2.4, {
          isStatic: true,
          friction: 0.35,
        }),
        Bodies.rectangle(width + thickness / 2, height / 2, thickness, height * 2.4, {
          isStatic: true,
          friction: 0.35,
        }),
        // High ceiling so parked off-screen pieces don't hit it before dropping.
        Bodies.rectangle(
          width / 2,
          -Math.max(height * 0.85, 320) - thickness / 2,
          width * 1.6,
          thickness,
          {
            isStatic: true,
            friction: 0.2,
            restitution: 0.2,
          },
        ),
      ];

      const longEdge = Math.max(
        84,
        Math.min(width * PIECE_SIZE_RATIO, 156),
      );

      // Hold gravity at 0 during the intro pause so nothing drifts on-screen.
      engine.gravity.y = dropping || reduced ? 0 : 1.15;

      const dropSpawns: { x: number; y: number }[] = [];

      PIECES.forEach((def, index) => {
        const el = pieceEls.get(def.id);
        if (!el) return;
        const pieceW = def.aspect >= 1 ? longEdge : longEdge * def.aspect;
        const pieceH = def.aspect >= 1 ? longEdge / def.aspect : longEdge;
        el.style.width = `${pieceW}px`;
        el.style.height = `${pieceH}px`;
        el.style.opacity = dropping ? "0" : "1";
        el.style.zIndex = def.id === "logo-w" ? "3" : "2";

        const startX = dropping
          ? width * (0.12 + (index / Math.max(1, PIECES.length - 1)) * 0.76) +
            (Math.random() - 0.5) * 12
          : def.restX * width;
        // Fully above the clip rect — screen stays empty until release.
        const startY = dropping ? -(pieceH + 40) : def.restY * height;
        if (dropping) dropSpawns.push({ x: startX, y: startY });

        const body = Bodies.rectangle(startX, startY, pieceW * 0.78, pieceH * 0.78, {
          chamfer: { radius: Math.min(30, pieceW * 0.16) },
          friction: 0.5,
          frictionAir: 0.014,
          restitution: 0.4,
          density: def.density ?? 0.0024,
          angle: def.angle + (Math.random() - 0.5) * 0.2,
          label: def.id,
        });
        Body.setVelocity(body, { x: 0, y: 0 });
        Body.setAngularVelocity(body, 0);
        runtimes.push({ body, el, width: pieceW, height: pieceH });
      });

      World.add(engine.world, [...walls, ...runtimes.map((item) => item.body)]);
      syncSprites();
      builtOnce = true;

      if (dropping) {
        introDropActive = true;
        const total = runtimes.length;
        runtimes.forEach((item, index) => {
          const spawn = dropSpawns[index] ?? {
            x: item.body.position.x,
            y: -item.height - 40,
          };
          dropTimers.push(
            window.setTimeout(() => {
              if (!alive || !introDropActive) return;
              // Re-seat just above the top, reveal, then let gravity take over.
              if (index === 0) engine.gravity.y = 1.15;
              Body.setPosition(item.body, spawn);
              Body.setVelocity(item.body, {
                x: (Math.random() - 0.5) * 1.4,
                y: 3 + Math.random() * 2.5,
              });
              Body.setAngularVelocity(item.body, (Math.random() - 0.5) * 0.08);
              item.el.style.opacity = "1";
              syncSprites();
              if (index >= total - 1) introDropActive = false;
            }, DROP_DELAY_MS + index * DROP_STAGGER_MS),
          );
        });
      }

      return true;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || dragBody) return;
      void enableMotion();
      const point = toWorld(event.clientX, event.clientY);
      const bodies = runtimes.map((item) => item.body);
      const hits = Query.point(bodies, point);
      if (!hits.length) return;

      // Prefer the topmost / last-added hit (logo sits high in list but z-index higher).
      const hit =
        hits.find((body) => body.label === "logo-w") ?? hits[hits.length - 1];
      dragBody = hit;
      dragPointerId = event.pointerId;
      lastDrag = { x: point.x, y: point.y, t: performance.now() };
      dragVelocity = { x: 0, y: 0 };
      root.style.cursor = "grabbing";
      root.setPointerCapture(event.pointerId);

      dragConstraint = Constraint.create({
        pointA: { x: point.x, y: point.y },
        bodyB: hit,
        pointB: {
          x: point.x - hit.position.x,
          y: point.y - hit.position.y,
        },
        stiffness: 0.22,
        damping: 0.08,
        length: 0,
      });
      World.add(engine.world, dragConstraint);
      event.preventDefault();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragConstraint || dragPointerId !== event.pointerId) return;
      const point = toWorld(event.clientX, event.clientY);
      const now = performance.now();
      const dt = Math.max(8, now - lastDrag.t);
      dragVelocity = {
        x: ((point.x - lastDrag.x) / dt) * 16.67,
        y: ((point.y - lastDrag.y) / dt) * 16.67,
      };
      lastDrag = { x: point.x, y: point.y, t: now };
      dragConstraint.pointA = { x: point.x, y: point.y };
      event.preventDefault();
    };

    const onPointerUp = (event: PointerEvent) => {
      if (dragPointerId !== event.pointerId) return;
      endDrag();
    };

    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerup", onPointerUp);
    root.addEventListener("pointercancel", onPointerUp);

    let lastTick = performance.now();
    const loop = (now: number) => {
      if (!alive) return;
      const delta = Math.min(33, now - lastTick);
      lastTick = now;
      Engine.update(engine, delta);
      syncSprites();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const resize = (dropIn: boolean) => {
      // Don't rebuild mid-intro — that was canceling the delayed fall.
      if (introDropActive && !dropIn) return;
      const width = root.clientWidth;
      const height = root.clientHeight;
      if (
        builtOnce &&
        Math.abs(width - lastW) < 2 &&
        Math.abs(height - lastH) < 2 &&
        lastW > 0
      ) {
        return;
      }
      lastW = width;
      lastH = height;
      build(dropIn);
    };

    let tries = 0;
    const boot = () => {
      resize(!builtOnce);
      if (!builtOnce && tries < 30) {
        tries += 1;
        window.setTimeout(boot, 50);
      }
    };
    boot();

    const onMotion = (event: DeviceMotionEvent) => {
      if (reduced) return;
      const acc = event.accelerationIncludingGravity;
      if (!acc) return;
      const ax = acc.x ?? 0;
      const ay = acc.y ?? 0;
      engine.gravity.x = Common.clamp(ax / 9.81, -1.2, 1.2) * 0.85;
      engine.gravity.y = Common.clamp(-ay / 9.81, -0.35, 1.6) * 1.05;
      if (Math.abs(engine.gravity.y) < 0.25) engine.gravity.y = 0.55;
    };

    const enableMotion = async () => {
      if (motionAttached || reduced) return;
      try {
        const DME = DeviceMotionEvent as unknown as {
          requestPermission?: () => Promise<"granted" | "denied">;
        };
        if (typeof DME.requestPermission === "function") {
          const permission = await DME.requestPermission();
          if (permission !== "granted") return;
        }
      } catch {
        return;
      }
      window.addEventListener("devicemotion", onMotion, { passive: true });
      motionAttached = true;
    };

    const ro = new ResizeObserver(() => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => resize(false), 140);
    });
    ro.observe(root);

    return () => {
      alive = false;
      clearDropTimers();
      endDrag();
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerup", onPointerUp);
      root.removeEventListener("pointercancel", onPointerUp);
      if (motionAttached) window.removeEventListener("devicemotion", onMotion);
      ro.disconnect();
      window.clearTimeout(resizeTimer);
      cancelAnimationFrame(raf);
      World.clear(engine.world, false);
      Engine.clear(engine);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="absolute inset-0 overflow-hidden bg-black"
      aria-hidden
    >
      <div ref={layerRef} className="absolute inset-0">
        {PIECES.map((piece) => (
          <img
            key={piece.id}
            data-piece={piece.id}
            src={piece.src}
            alt=""
            draggable={false}
            className="pointer-events-none absolute left-0 top-0 origin-center select-none object-contain will-change-transform"
            style={{
              width: 1,
              height: 1,
              transform: "translate3d(-9999px,0,0)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
