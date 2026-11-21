"use client";

import NumberFlow from "@number-flow/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CELL_SIZE,
  createInitialState,
  FOOD_PIECES,
  FOOD_POINTS,
  GRID_COLS,
  GRID_ROWS,
  queueDirection,
  startGame,
  tick,
  TICK_MS,
  WIN_SCORE,
  type Direction,
  type Food,
  type FoodKind,
  type FoodPiece,
  type WormGameState,
} from "@/components/playground/projects/worm/worm-game";
import {
  playWormDie,
  playWormEat,
  playWormStart,
  playWormWin,
  resumeWormAudio,
} from "@/components/playground/projects/worm/worm-sfx";

const GRID_WIDTH = GRID_COLS * CELL_SIZE;
const GRID_HEIGHT = GRID_ROWS * CELL_SIZE;
const PHONE_WIDTH = GRID_WIDTH;
const PHONE_HEIGHT = GRID_HEIGHT;
const SHAKE_FX_MS = 360;
/** Longest edge of food art relative to a cell — oversized so pieces read clearly. */
const FOOD_LONG_EDGE = CELL_SIZE * 2.35;

type FoodVisual = FoodPiece | "logo-w";

const FOOD_SRC: Record<FoodVisual, string> = {
  "logo-w": "/worm-app/physics/logo-w.png",
  football: "/worm-app/physics/piece-football.png",
  alien: "/worm-app/physics/piece-alien.png",
  "gold-e": "/worm-app/physics/piece-gold-e.png",
  tennis: "/worm-app/physics/piece-tennis.png",
  golf: "/worm-app/physics/piece-golf.png",
  "flag-r": "/worm-app/physics/piece-flag-r.png",
  "marble-n": "/worm-app/physics/piece-marble-n.png",
  arrow: "/worm-app/physics/piece-arrow.png",
  "crystal-a": "/worm-app/physics/piece-crystal-a.png",
  cash: "/worm-app/physics/piece-cash.png",
  soccer: "/worm-app/physics/piece-soccer.png",
};

const FOOD_FALLBACK = "rgba(255, 255, 255, 0.55)";

const KEY_TO_DIR: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
};

const SNAKE_RADIUS = CELL_SIZE / 2 - 1;
const SNAKE_COLOR = "#fff";

type FoodSprites = Partial<Record<FoodVisual, HTMLImageElement>>;

function cellCenter(x: number, y: number) {
  return {
    x: x * CELL_SIZE + CELL_SIZE / 2,
    y: y * CELL_SIZE + CELL_SIZE / 2,
  };
}

function prepareDrawContext(ctx: CanvasRenderingContext2D) {
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
}

function traceSnakePath(
  ctx: CanvasRenderingContext2D,
  snake: WormGameState["snake"],
) {
  const head = cellCenter(snake[0]!.x, snake[0]!.y);
  ctx.beginPath();
  ctx.moveTo(head.x, head.y);
  for (let i = 1; i < snake.length; i++) {
    const center = cellCenter(snake[i]!.x, snake[i]!.y);
    ctx.lineTo(center.x, center.y);
  }
}

function drawSnake(
  ctx: CanvasRenderingContext2D,
  snake: WormGameState["snake"],
) {
  if (snake.length === 0) return;

  prepareDrawContext(ctx);
  const lineWidth = SNAKE_RADIUS * 2;

  if (snake.length === 1) {
    const center = cellCenter(snake[0]!.x, snake[0]!.y);
    ctx.beginPath();
    ctx.arc(center.x, center.y, SNAKE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = SNAKE_COLOR;
    ctx.fill();
    return;
  }

  traceSnakePath(ctx, snake);
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = SNAKE_COLOR;
  ctx.stroke();
}

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  shape: "spark" | "star" | "sprite" | "ring" | "glow";
  rot: number;
  rotSpeed: number;
  piece?: FoodVisual;
};

type ScorePop = {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
};

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

function foodDrawSize(img: HTMLImageElement, longEdge: number) {
  const nw = img.naturalWidth || 1;
  const nh = img.naturalHeight || 1;
  const scale = longEdge / Math.max(nw, nh);
  return { w: nw * scale, h: nh * scale };
}

function drawPieceFood(
  ctx: CanvasRenderingContext2D,
  food: Food,
  sprites: FoodSprites,
  now: number,
) {
  const { x, y } = cellCenter(food.x, food.y);
  const bob = Math.sin(now / 280) * 1.4;
  const pulse = 1 + Math.sin(now / 240) * 0.05;
  const premium = food.kind === "logo";
  const longEdge = FOOD_LONG_EDGE * pulse * (premium ? 1.08 : 1);

  prepareDrawContext(ctx);

  const img = sprites[food.piece];
  if (img && img.complete && img.naturalWidth > 0) {
    const { w, h } = foodDrawSize(img, longEdge);
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.rotate(Math.sin(now / 380) * (premium ? 0.1 : 0.06));
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
    return;
  }

  // Fallback disc while sprites load.
  ctx.beginPath();
  ctx.arc(x, y + bob, longEdge * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = FOOD_FALLBACK;
  ctx.fill();
}

function drawFood(
  ctx: CanvasRenderingContext2D,
  food: Food,
  sprites: FoodSprites,
  now: number,
) {
  drawPieceFood(ctx, food, sprites, now);
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  spikes = 4,
) {
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const ang = (i * Math.PI) / spikes - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.38;
    const px = x + Math.cos(ang) * rad;
    const py = y + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function spawnEatBurst(
  kind: FoodKind,
  piece: FoodVisual,
  x: number,
  y: number,
): Particle[] {
  const particles: Particle[] = [];
  const push = (
    p: Omit<Particle, "rot" | "rotSpeed"> &
      Partial<Pick<Particle, "rot" | "rotSpeed">>,
  ) => {
    particles.push({
      rot: 0,
      rotSpeed: 0,
      ...p,
    });
  };

  const sparkColors: Record<FoodKind, [string, string]> = {
    small: ["#E8E8EE", "#9A9AA8"],
    big: ["#5AD66A", "#B8FF9A"],
    logo: ["#FFD56A", "#FF9F43"],
  };
  const ringColors: Record<FoodKind, string> = {
    small: "rgba(220, 220, 230, 0.45)",
    big: "rgba(90, 214, 106, 0.45)",
    logo: "rgba(255, 210, 90, 0.5)",
  };
  const [c1, c2] = sparkColors[kind];
  const premium = kind === "logo";
  const spriteCount = kind === "small" ? 3 : kind === "big" ? 5 : 4;
  const sparkCount = premium ? 28 : kind === "big" ? 18 : 14;

  for (let i = 0; i < spriteCount; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * (premium ? 2.2 : 1.6);
    const speed = 1.1 + Math.random() * (premium ? 2.8 : 2.2);
    push({
      x,
      y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed - 1.1,
      life: 1,
      maxLife: 0.55 + Math.random() * 0.3,
      size: 14 + Math.random() * 8,
      color: "#fff",
      shape: "sprite",
      piece,
      rotSpeed: (Math.random() - 0.5) * 4,
    });
  }

  for (let i = 0; i < sparkCount; i++) {
    const a = (Math.PI * 2 * i) / sparkCount + Math.random() * 0.2;
    const speed = (premium ? 2.0 : 1.4) + Math.random() * (premium ? 3.4 : 2.4);
    push({
      x,
      y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed - 0.5,
      life: 1,
      maxLife: 0.45 + Math.random() * 0.3,
      size: 1.3 + Math.random() * 2.2,
      color: i % 2 === 0 ? c1 : c2,
      shape: i % 3 === 0 ? "star" : "spark",
      rotSpeed: (Math.random() - 0.5) * 10,
    });
  }

  push({
    x,
    y,
    vx: 0,
    vy: 0,
    life: 1,
    maxLife: premium ? 0.5 : 0.35,
    size: premium ? 12 : kind === "big" ? 10 : 7,
    color: ringColors[kind],
    shape: "ring",
  });

  if (premium) {
    for (let i = 0; i < 3; i++) {
      push({
        x,
        y,
        vx: 0,
        vy: 0,
        life: 1,
        maxLife: 0.55 + i * 0.12,
        size: 8 + i * 6,
        color: ringColors[kind].replace(
          /[\d.]+\)$/,
          `${(0.48 - i * 0.12).toFixed(2)})`,
        ),
        shape: "ring",
      });
    }
    push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 1,
      maxLife: 0.5,
      size: 24,
      color: ringColors[kind],
      shape: "glow",
    });
  }

  return particles;
}

function scorePopFor(kind: FoodKind, x: number, y: number): ScorePop {
  const colors: Record<FoodKind, string> = {
    small: "#E8E8EE",
    big: "#7CFFB2",
    logo: "#FFD56A",
  };
  return {
    x,
    y: y - 6,
    text: `+${FOOD_POINTS[kind]}`,
    color: colors[kind],
    life: 1,
    maxLife: kind === "logo" ? 0.9 : 0.7,
  };
}

function stepFx(
  particles: Particle[],
  pops: ScorePop[],
  dt: number,
): { particles: Particle[]; pops: ScorePop[] } {
  const nextParticles: Particle[] = [];
  for (const p of particles) {
    const life = p.life - dt / p.maxLife;
    if (life <= 0) continue;
    nextParticles.push({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      vx: p.vx * 0.96,
      vy: p.vy * 0.96 + (p.shape === "sprite" ? 0.08 : 0.04),
      rot: p.rot + p.rotSpeed * dt,
      life,
    });
  }

  const nextPops: ScorePop[] = [];
  for (const pop of pops) {
    const life = pop.life - dt / pop.maxLife;
    if (life <= 0) continue;
    nextPops.push({
      ...pop,
      y: pop.y - 28 * dt,
      life,
    });
  }

  return { particles: nextParticles, pops: nextPops };
}

function drawFx(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  pops: ScorePop[],
  sprites: FoodSprites,
) {
  for (const p of particles) {
    const t = 1 - p.life;
    const alpha = Math.max(0, p.life);
    prepareDrawContext(ctx);
    ctx.globalAlpha = alpha;

    if (p.shape === "ring") {
      const r = p.size + easeOutCubic(t) * p.size * 2.4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = Math.max(1, 2.4 * p.life);
      ctx.stroke();
      continue;
    }

    if (p.shape === "glow") {
      const r = p.size * (0.7 + easeOutCubic(t) * 1.4);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      g.addColorStop(0, p.color);
      g.addColorStop(1, "rgba(255,200,80,0)");
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      continue;
    }

    if (p.shape === "sprite" && p.piece) {
      const img = sprites[p.piece];
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      const scale = 0.7 + p.life * 0.5;
      if (img && img.complete && img.naturalWidth > 0) {
        const { w, h } = foodDrawSize(img, p.size);
        ctx.scale(scale, scale);
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.35 * scale, 0, Math.PI * 2);
        ctx.fillStyle = FOOD_FALLBACK;
        ctx.fill();
      }
      ctx.restore();
      continue;
    }

    ctx.fillStyle = p.color;
    if (p.shape === "star") {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      drawStar(ctx, 0, 0, p.size * (0.6 + p.life * 0.6));
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const pop of pops) {
    prepareDrawContext(ctx);
    ctx.globalAlpha = Math.max(0, pop.life);
    ctx.font = `600 ${13 + (1 - pop.life) * 4}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = pop.color;
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 6;
    ctx.fillText(pop.text, pop.x, pop.y);
  }

  prepareDrawContext(ctx);
}

function drawGame(
  ctx: CanvasRenderingContext2D,
  state: WormGameState,
  sprites: FoodSprites,
  now: number,
  particles: Particle[],
  pops: ScorePop[],
) {
  ctx.clearRect(0, 0, GRID_WIDTH, GRID_HEIGHT);

  drawSnake(ctx, state.snake);
  if (state.status !== "won") {
    drawFood(ctx, state.food, sprites, now);
  }
  drawFx(ctx, particles, pops, sprites);
}

export default function Worm({
  embedded = false,
  onWin,
}: {
  /** Fill parent (onboarding) instead of a fixed phone frame. */
  embedded?: boolean;
  /** Fired once when challenge score hits the unlock target. */
  onWin?: () => void;
}) {
  const challenge = embedded;
  const shellRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spritesRef = useRef<FoodSprites>({});
  const stateRef = useRef<WormGameState>(createInitialState(challenge));
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const shakeTimerRef = useRef<number | null>(null);
  const wonRef = useRef(false);
  const particlesRef = useRef<Particle[]>([]);
  const popsRef = useRef<ScorePop[]>([]);
  const reduceMotionRef = useRef(false);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [isReady, setIsReady] = useState(true);
  const [isWallShakeFx, setIsWallShakeFx] = useState(false);
  const [eatBurstClass, setEatBurstClass] = useState("");
  const [scale, setScale] = useState(1);
  const [spritesReady, setSpritesReady] = useState(false);

  const triggerWallShake = useCallback(() => {
    if (reduceMotionRef.current) return;
    setIsWallShakeFx(true);
    if (shakeTimerRef.current !== null) {
      window.clearTimeout(shakeTimerRef.current);
    }
    shakeTimerRef.current = window.setTimeout(() => {
      setIsWallShakeFx(false);
      shakeTimerRef.current = null;
    }, SHAKE_FX_MS);
  }, []);

  const triggerEatFlash = useCallback((kind: FoodKind) => {
    if (reduceMotionRef.current) return;
    const cls =
      kind === "logo"
        ? "animate-[worm-eat-logo_520ms_ease-out_1]"
        : kind === "big"
          ? "animate-[worm-eat-red_420ms_ease-out_1]"
          : "animate-[worm-eat-soccer_320ms_ease-out_1]";
    setEatBurstClass(cls);
    window.setTimeout(() => setEatBurstClass(""), 560);
  }, []);

  const syncUi = useCallback((state: WormGameState) => {
    setScore(state.score);
    setGameOver(state.status === "over");
    setWon(state.status === "won");
    setIsReady(state.status === "ready");
  }, []);

  const spawnEatFx = useCallback((food: Food) => {
    const { x, y } = cellCenter(food.x, food.y);
    playWormEat(food.kind);
    if (!reduceMotionRef.current) {
      particlesRef.current = [
        ...particlesRef.current,
        ...spawnEatBurst(food.kind, food.piece, x, y),
      ];
      triggerEatFlash(food.kind);
    }
    popsRef.current = [...popsRef.current, scorePopFor(food.kind, x, y)];
  }, [triggerEatFlash]);

  const reset = useCallback(() => {
    wonRef.current = false;
    particlesRef.current = [];
    popsRef.current = [];
    stateRef.current = createInitialState(challenge);
    syncUi(stateRef.current);
    setEatBurstClass("");
    setIsWallShakeFx(false);
    if (shakeTimerRef.current !== null) {
      window.clearTimeout(shakeTimerRef.current);
      shakeTimerRef.current = null;
    }
  }, [challenge, syncUi]);

  const applyDirection = useCallback((dir: Direction) => {
    stateRef.current = queueDirection(stateRef.current, dir);
  }, []);

  useEffect(() => {
    reduceMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  }, []);

  useEffect(() => {
    const visuals = ["logo-w", ...FOOD_PIECES] as FoodVisual[];
    let pending = visuals.length;
    const next: FoodSprites = {};

    visuals.forEach((piece) => {
      const img = new Image();
      img.decoding = "async";
      img.src = FOOD_SRC[piece];
      const mark = () => {
        if (img.naturalWidth > 0) next[piece] = img;
        pending -= 1;
        if (pending <= 0) {
          spritesRef.current = next;
          setSpritesReady(true);
        }
      };
      if (img.complete && img.naturalWidth > 0) mark();
      else {
        img.onload = mark;
        img.onerror = mark;
      }
    });

    return () => {
      visuals.forEach((piece) => {
        const img = next[piece];
        if (img) {
          img.onload = null;
          img.onerror = null;
        }
      });
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
    canvas.width = GRID_WIDTH * dpr;
    canvas.height = GRID_HEIGHT * dpr;
    canvas.style.width = `${GRID_WIDTH}px`;
    canvas.style.height = `${GRID_HEIGHT}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, [spritesReady]);

  useEffect(() => {
    if (!embedded) return;
    const shell = shellRef.current;
    if (!shell) return;

    const measure = () => {
      const { width, height } = shell.getBoundingClientRect();
      if (width < 40 || height < 40) return;
      setScale(Math.min(width / GRID_WIDTH, height / GRID_HEIGHT, 1.85));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(shell);
    return () => ro.disconnect();
  }, [embedded]);

  // Smooth paint loop — idle food motion + sparkles between ticks.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const stepped = stepFx(particlesRef.current, popsRef.current, dt);
      particlesRef.current = stepped.particles;
      popsRef.current = stepped.pops;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx) {
        drawGame(
          ctx,
          stateRef.current,
          spritesRef.current,
          now,
          particlesRef.current,
          popsRef.current,
        );
      }
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (stateRef.current.status !== "playing") return;

      const prev = stateRef.current;
      const next = tick(prev);
      if (prev.status === "playing" && next.status === "over") {
        playWormDie();
        if (next.deathCause === "wall") triggerWallShake();
      }

      if (next.score > prev.score) {
        spawnEatFx(prev.food);
        if (next.status === "won") {
          const { x, y } = cellCenter(prev.food.x, prev.food.y);
          particlesRef.current = [
            ...particlesRef.current,
            ...spawnEatBurst("logo", "logo-w", x, y),
            ...spawnEatBurst("big", "cash", x, y),
          ];
          playWormWin();
        }
      }

      stateRef.current = next;
      syncUi(next);

      if (next.status === "won" && !wonRef.current) {
        wonRef.current = true;
        window.setTimeout(() => onWin?.(), 900);
      }
    }, TICK_MS);

    return () => window.clearInterval(interval);
  }, [onWin, spawnEatFx, syncUi, triggerWallShake]);

  useEffect(() => {
    return () => {
      if (shakeTimerRef.current !== null) {
        window.clearTimeout(shakeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    frameRef.current?.focus();
  }, []);

  useEffect(() => {
    if (gameOver || isReady || won) frameRef.current?.focus();
  }, [gameOver, isReady, won]);

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    void resumeWormAudio();
    if (stateRef.current.status === "won") return;
    if (stateRef.current.status === "over") {
      reset();
      return;
    }
    pointerStart.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (stateRef.current.status === "won") return;
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start) return;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const dir: Direction =
      absDx < 24 && absDy < 24
        ? "right"
        : absDx > absDy
          ? dx > 0
            ? "right"
            : "left"
          : dy > 0
            ? "down"
            : "up";

    if (stateRef.current.status === "ready") {
      stateRef.current = startGame(stateRef.current, dir);
      syncUi(stateRef.current);
      playWormStart();
      return;
    }

    if (stateRef.current.status !== "playing") return;
    if (absDx < 24 && absDy < 24) return;
    applyDirection(dir);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (stateRef.current.status === "won") return;
    void resumeWormAudio();
    const dir = KEY_TO_DIR[e.key];

    if (stateRef.current.status === "over") {
      e.preventDefault();
      reset();
      if (dir) {
        stateRef.current = startGame(stateRef.current, dir);
        syncUi(stateRef.current);
        playWormStart();
      }
      return;
    }

    if (stateRef.current.status === "ready") {
      if (!dir) return;
      e.preventDefault();
      stateRef.current = startGame(stateRef.current, dir);
      syncUi(stateRef.current);
      playWormStart();
      return;
    }

    if (!dir) return;
    e.preventDefault();
    applyDirection(dir);
  };

  const fxClass = [
    isWallShakeFx ? "animate-[worm-shake_360ms_ease-in-out_1]" : "",
    eatBurstClass,
  ]
    .filter(Boolean)
    .join(" ");

  const fxStyles = `
    @keyframes worm-shake {
      0% { transform: translate3d(0, 0, 0); }
      20% { transform: translate3d(-1px, 0, 0); }
      40% { transform: translate3d(1px, 0, 0); }
      60% { transform: translate3d(-1px, 0, 0); }
      80% { transform: translate3d(1px, 0, 0); }
      100% { transform: translate3d(0, 0, 0); }
    }
    @keyframes worm-eat-soccer {
      0% { filter: brightness(1); }
      35% { filter: brightness(1.35) saturate(1.2); }
      100% { filter: brightness(1); }
    }
    @keyframes worm-eat-red {
      0% { filter: brightness(1) saturate(1) hue-rotate(0deg); }
      40% { filter: brightness(1.3) saturate(1.4) hue-rotate(-8deg); }
      100% { filter: brightness(1) saturate(1) hue-rotate(0deg); }
    }
    @keyframes worm-eat-logo {
      0% { filter: brightness(1) saturate(1) contrast(1); }
      28% { filter: brightness(1.55) saturate(1.55) contrast(1.08); }
      100% { filter: brightness(1) saturate(1) contrast(1); }
    }
    @keyframes worm-hint-pulse {
      0%, 100% { opacity: 0.4; transform: translate3d(0, 0, 0); }
      50% { opacity: 0.85; transform: translate3d(0, -2px, 0); }
    }
    @keyframes worm-youre-in {
      0% {
        opacity: 0;
        transform: scale(0.72);
        letter-spacing: -0.08em;
        filter: blur(8px) brightness(1.8);
      }
      55% {
        opacity: 1;
        transform: scale(1.08);
        letter-spacing: 0.02em;
        filter: blur(0) brightness(1.25);
      }
      78% {
        transform: scale(0.97);
        letter-spacing: -0.01em;
      }
      100% {
        opacity: 1;
        transform: scale(1);
        letter-spacing: -0.03em;
        filter: blur(0) brightness(1);
      }
    }
    @keyframes worm-youre-in-glow {
      0%, 100% { text-shadow: 0 0 18px rgba(255, 220, 120, 0.35), 0 0 40px rgba(255, 180, 60, 0.18); }
      50% { text-shadow: 0 0 28px rgba(255, 230, 150, 0.55), 0 0 56px rgba(255, 200, 80, 0.28); }
    }
    @keyframes worm-youre-in-veil {
      0% { opacity: 0; }
      100% { opacity: 1; }
    }
    @keyframes worm-gloss-spin {
      to { transform: rotate(360deg); }
    }
    .worm-play-gloss-ring {
      overflow: hidden;
      -webkit-mask:
        linear-gradient(#fff 0 0) content-box,
        linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask:
        linear-gradient(#fff 0 0) content-box,
        linear-gradient(#fff 0 0);
      mask-composite: exclude;
      padding: 1.5px;
    }
    .worm-play-gloss-ring::before {
      content: "";
      position: absolute;
      inset: -60%;
      background: conic-gradient(
        from 0deg,
        rgba(255, 255, 255, 0.015) 0%,
        rgba(255, 255, 255, 0.04) 14%,
        rgba(255, 255, 255, 0.28) 22%,
        rgba(255, 255, 255, 0.06) 32%,
        rgba(255, 255, 255, 0.02) 48%,
        rgba(255, 255, 255, 0.14) 62%,
        rgba(255, 255, 255, 0.035) 74%,
        rgba(255, 255, 255, 0.015) 100%
      );
      animation: worm-gloss-spin 22s linear infinite;
    }
    @media (prefers-reduced-motion: reduce) {
      .worm-play-gloss-ring::before {
        animation: none;
        inset: 0;
        background: linear-gradient(
          145deg,
          rgba(255, 255, 255, 0.14),
          rgba(255, 255, 255, 0.03) 45%,
          rgba(255, 255, 255, 0.08)
        );
      }
    }
  `;

  const scoreLabel = challenge ? (
    <span className="inline-flex items-baseline gap-1">
      <NumberFlow value={score} />
      <span className="text-[18px] font-light text-white/35">/{WIN_SCORE}</span>
    </span>
  ) : (
    <NumberFlow value={score} />
  );

  const hint = isReady ? (
    <p
      className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 px-3 pb-7 text-center text-[28px] font-medium leading-snug tracking-[-0.03em] text-white/50 ${
        challenge
          ? "motion-safe:animate-[worm-hint-pulse_2.4s_ease-in-out_infinite]"
          : ""
      }`}
    >
      {challenge ? `Reach ${WIN_SCORE} to get in` : "Tap and swipe to control worm."}
    </p>
  ) : null;

  if (embedded) {
    const boardW = Math.round(GRID_WIDTH * scale);
    const boardH = Math.round(GRID_HEIGHT * scale);
    return (
      <div
        ref={shellRef}
        className="flex h-full w-full flex-col items-center justify-center"
      >
        <div
          ref={frameRef}
          tabIndex={0}
          className={`relative cursor-pointer touch-none select-none overflow-hidden rounded-[22px] outline-none ${fxClass}`}
          style={{ width: Math.max(boardW, 1), height: Math.max(boardH, 1) }}
          aria-label={
            won
              ? "Worm — you made it in"
              : gameOver
                ? "Worm — press a key to restart"
                : isReady
                  ? "Worm — tap and swipe to control"
                  : "Worm — snake game"
          }
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onKeyDown={onKeyDown}
        >
          <span
            aria-hidden
            className="worm-play-gloss-ring pointer-events-none absolute inset-0 z-[5] rounded-[22px]"
          />
          <canvas
            ref={canvasRef}
            className="absolute left-0 top-0 origin-top-left"
            style={{
              transform: `scale(${scale})`,
              width: GRID_WIDTH,
              height: GRID_HEIGHT,
            }}
          />

          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-center pt-7 text-[40px] font-light leading-none tabular-nums tracking-tight text-white"
            aria-live="polite"
          >
            {scoreLabel}
          </div>

          {hint}

          {gameOver ? (
            <p className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-[32px] font-semibold tracking-[-0.03em] text-white/60">
              Game over
            </p>
          ) : null}

          {won ? (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center motion-safe:animate-[worm-youre-in-veil_420ms_ease-out_both] bg-black/45">
              <p className="text-[32px] font-semibold tracking-[-0.03em] text-white motion-safe:animate-[worm-youre-in_720ms_cubic-bezier(0.22,1,0.36,1)_both,worm-youre-in-glow_1.8s_ease-in-out_720ms_infinite]">
                You&apos;re in
              </p>
            </div>
          ) : null}
        </div>
        <style>{fxStyles}</style>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <div
        ref={frameRef}
        tabIndex={0}
        className={`relative cursor-pointer touch-none select-none outline-none overflow-hidden rounded-[2.75rem] border-2 border-white/10 ${fxClass}`}
        style={{ width: PHONE_WIDTH, height: PHONE_HEIGHT }}
        aria-label={
          gameOver
            ? "Snake — press a key to restart"
            : isReady
              ? "Worm — swipe or press a key to start"
              : "Worm — snake game"
        }
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <div
          className="pointer-events-none absolute left-1/2 top-8 z-10 -translate-x-1/2 text-4xl font-light tabular-nums tracking-tight text-white"
          aria-live="polite"
        >
          <NumberFlow value={score} />
        </div>

        <canvas ref={canvasRef} className="absolute inset-0 block" />

        {isReady && (
          <p className="pointer-events-none absolute inset-x-0 bottom-10 z-10 text-center text-sm text-white/45">
            Swipe or press a key
          </p>
        )}

        {gameOver && (
          <p className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-[32px] font-semibold tracking-[-0.03em] text-white/60">
            Game over
          </p>
        )}
      </div>
      <style>{fxStyles}</style>
    </div>
  );
}
