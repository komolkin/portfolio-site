"use client";

import NumberFlow from "@number-flow/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CELL_SIZE,
  createInitialState,
  GRID_COLS,
  GRID_ROWS,
  queueDirection,
  startGame,
  tick,
  TICK_MS,
  type Direction,
  type WormGameState,
} from "@/components/playground/projects/worm/worm-game";

const PHONE_WIDTH = 280;
const PHONE_HEIGHT = 580;
const GRID_WIDTH = GRID_COLS * CELL_SIZE;
const GRID_HEIGHT = GRID_ROWS * CELL_SIZE;
const SHAKE_FX_MS = 360;

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
/** Worm accent red — aqua gel surface for food. */
const FOOD_RED_TOP = "#ff7a93";
const FOOD_RED_MID = "#FF375F";
const FOOD_RED_BOT = "#c9183a";
const FOOD_RED_EDGE = "#8f102c";

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

function drawFood(ctx: CanvasRenderingContext2D, food: WormGameState["food"]) {
  const { x, y } = cellCenter(food.x, food.y);
  const r = SNAKE_RADIUS;

  prepareDrawContext(ctx);

  // Soft drop — matches Aqua button depth.
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 2;

  const body = ctx.createLinearGradient(x, y - r, x, y + r);
  body.addColorStop(0, FOOD_RED_TOP);
  body.addColorStop(0.42, FOOD_RED_MID);
  body.addColorStop(1, FOOD_RED_BOT);

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = body;
  ctx.fill();

  prepareDrawContext(ctx);

  // Edge lip
  ctx.beginPath();
  ctx.arc(x, y, r - 0.5, 0, Math.PI * 2);
  ctx.strokeStyle = FOOD_RED_EDGE;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Color-burn-ish bottom band
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r - 1, 0, Math.PI * 2);
  ctx.clip();
  const burn = ctx.createLinearGradient(x, y + r * 0.15, x, y + r);
  burn.addColorStop(0, "rgba(120, 10, 30, 0)");
  burn.addColorStop(1, "rgba(120, 10, 30, 0.45)");
  ctx.fillStyle = burn;
  ctx.fillRect(x - r, y, r * 2, r);
  ctx.restore();

  // Top gloss (heyclicky aqua highlight)
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r - 1, 0, Math.PI * 2);
  ctx.clip();
  const gloss = ctx.createLinearGradient(x, y - r, x, y - r * 0.1);
  gloss.addColorStop(0, "rgba(255,255,255,0.85)");
  gloss.addColorStop(0.55, "rgba(255,255,255,0.28)");
  gloss.addColorStop(1, "rgba(255,255,255,0)");
  ctx.beginPath();
  ctx.ellipse(x, y - r * 0.42, r * 0.62, r * 0.36, 0, 0, Math.PI * 2);
  ctx.fillStyle = gloss;
  ctx.fill();

  // Specular chip
  ctx.beginPath();
  ctx.ellipse(x, y - r * 0.55, r * 0.28, r * 0.14, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fill();
  ctx.restore();
}

function drawGame(ctx: CanvasRenderingContext2D, state: WormGameState) {
  ctx.clearRect(0, 0, GRID_WIDTH, GRID_HEIGHT);

  drawSnake(ctx, state.snake);
  drawFood(ctx, state.food);
}

export default function Worm({
  embedded = false,
}: {
  /** Fill parent (onboarding) instead of a fixed phone frame. */
  embedded?: boolean;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<WormGameState>(createInitialState());
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const shakeTimerRef = useRef<number | null>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isReady, setIsReady] = useState(true);
  const [isWallShakeFx, setIsWallShakeFx] = useState(false);
  const [scale, setScale] = useState(1);

  const triggerWallShake = useCallback(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setIsWallShakeFx(true);
    if (shakeTimerRef.current !== null) {
      window.clearTimeout(shakeTimerRef.current);
    }
    shakeTimerRef.current = window.setTimeout(() => {
      setIsWallShakeFx(false);
      shakeTimerRef.current = null;
    }, SHAKE_FX_MS);
  }, []);

  const syncUi = useCallback((state: WormGameState) => {
    setScore(state.score);
    setGameOver(state.status === "over");
    setIsReady(state.status === "ready");
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawGame(ctx, stateRef.current);
  }, []);

  const reset = useCallback(() => {
    stateRef.current = createInitialState();
    syncUi(stateRef.current);
    render();
    setIsWallShakeFx(false);
    if (shakeTimerRef.current !== null) {
      window.clearTimeout(shakeTimerRef.current);
      shakeTimerRef.current = null;
    }
  }, [render, syncUi]);

  const applyDirection = useCallback((dir: Direction) => {
    stateRef.current = queueDirection(stateRef.current, dir);
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
    render();
  }, [render]);

  useEffect(() => {
    if (!embedded) return;
    const shell = shellRef.current;
    if (!shell) return;

    const measure = () => {
      const { width, height } = shell.getBoundingClientRect();
      if (width < 40 || height < 40) return;
      // Prefer filling width; only shrink if height can't fit.
      setScale(Math.min(width / GRID_WIDTH, height / GRID_HEIGHT, 1.85));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(shell);
    return () => ro.disconnect();
  }, [embedded]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (stateRef.current.status !== "playing") return;

      const prev = stateRef.current;
      const next = tick(prev);
      if (
        prev.status === "playing" &&
        next.status === "over" &&
        next.deathCause === "wall"
      ) {
        triggerWallShake();
      }
      stateRef.current = next;
      syncUi(next);
      render();
    }, TICK_MS);

    return () => window.clearInterval(interval);
  }, [render, syncUi, triggerWallShake]);

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
    if (gameOver || isReady) frameRef.current?.focus();
  }, [gameOver, isReady]);

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (stateRef.current.status === "over") {
      reset();
      return;
    }
    pointerStart.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: React.PointerEvent) => {
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
      render();
      return;
    }

    if (stateRef.current.status !== "playing") return;
    if (absDx < 24 && absDy < 24) return;
    applyDirection(dir);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const dir = KEY_TO_DIR[e.key];

    if (stateRef.current.status === "over") {
      e.preventDefault();
      reset();
      if (dir) {
        stateRef.current = startGame(stateRef.current, dir);
        syncUi(stateRef.current);
        render();
      }
      return;
    }

    if (stateRef.current.status === "ready") {
      if (!dir) return;
      e.preventDefault();
      stateRef.current = startGame(stateRef.current, dir);
      syncUi(stateRef.current);
      render();
      return;
    }

    if (!dir) return;
    e.preventDefault();
    applyDirection(dir);
  };

  const shakeClass = isWallShakeFx
    ? "animate-[worm-shake_360ms_ease-in-out_1]"
    : "";

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
          className={`relative cursor-pointer touch-none select-none overflow-hidden rounded-[22px] shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.28)] outline-none ${shakeClass}`}
          style={{ width: Math.max(boardW, 1), height: Math.max(boardH, 1) }}
          aria-label={
            gameOver
              ? "Worm — press a key to restart"
              : isReady
                ? "Worm — tap and swipe to control"
                : "Worm — snake game"
          }
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onKeyDown={onKeyDown}
        >
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
            <NumberFlow value={score} />
          </div>

          {isReady ? (
            <p className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-3 pb-7 text-center text-[13px] leading-snug text-white/45">
              Tap and swipe to control worm.
            </p>
          ) : null}

          {gameOver ? (
            <p className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-sm text-white/55">
              Game over
            </p>
          ) : null}
        </div>
        <style>{`
          @keyframes worm-shake {
            0% { transform: translate3d(0, 0, 0); }
            20% { transform: translate3d(-1px, 0, 0); }
            40% { transform: translate3d(1px, 0, 0); }
            60% { transform: translate3d(-1px, 0, 0); }
            80% { transform: translate3d(1px, 0, 0); }
            100% { transform: translate3d(0, 0, 0); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <div
        ref={frameRef}
        tabIndex={0}
        className={`relative cursor-pointer touch-none select-none outline-none overflow-hidden rounded-[2.75rem] border-2 border-white/10 ${shakeClass}`}
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
          <p className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-sm text-white/55">
            Game over
          </p>
        )}
      </div>
      <style>{`
        @keyframes worm-shake {
          0% { transform: translate3d(0, 0, 0); }
          20% { transform: translate3d(-1px, 0, 0); }
          40% { transform: translate3d(1px, 0, 0); }
          60% { transform: translate3d(-1px, 0, 0); }
          80% { transform: translate3d(1px, 0, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
      `}</style>
    </div>
  );
}
