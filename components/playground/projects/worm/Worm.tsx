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
}

function traceSnakePath(ctx: CanvasRenderingContext2D, snake: WormGameState["snake"]) {
  const head = cellCenter(snake[0].x, snake[0].y);
  ctx.beginPath();
  ctx.moveTo(head.x, head.y);
  for (let i = 1; i < snake.length; i++) {
    const center = cellCenter(snake[i].x, snake[i].y);
    ctx.lineTo(center.x, center.y);
  }
}

function drawSnake(ctx: CanvasRenderingContext2D, snake: WormGameState["snake"]) {
  if (snake.length === 0) return;

  prepareDrawContext(ctx);
  const lineWidth = SNAKE_RADIUS * 2;

  if (snake.length === 1) {
    const center = cellCenter(snake[0].x, snake[0].y);
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
  const center = cellCenter(food.x, food.y);

  prepareDrawContext(ctx);
  ctx.beginPath();
  ctx.arc(center.x, center.y, SNAKE_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = SNAKE_COLOR;
  ctx.fill();
}

function drawGame(ctx: CanvasRenderingContext2D, state: WormGameState) {
  ctx.clearRect(0, 0, GRID_COLS * CELL_SIZE, GRID_HEIGHT);

  drawSnake(ctx, state.snake);
  drawFood(ctx, state.food);
}

export default function Worm() {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<WormGameState>(createInitialState());
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const shakeTimerRef = useRef<number | null>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isReady, setIsReady] = useState(true);
  const [isWallShakeFx, setIsWallShakeFx] = useState(false);

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

  const applyDirection = useCallback(
    (dir: Direction) => {
      stateRef.current = queueDirection(stateRef.current, dir);
    },
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
    canvas.width = GRID_COLS * CELL_SIZE * dpr;
    canvas.height = GRID_HEIGHT * dpr;
    canvas.style.width = `${GRID_COLS * CELL_SIZE}px`;
    canvas.style.height = `${GRID_HEIGHT}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    render();
  }, [render]);

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
    if (gameOver || isReady) frameRef.current?.focus();
  }, [gameOver, isReady]);

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (stateRef.current.status === "over") {
      reset();
      return;
    }
    if (stateRef.current.status === "ready") return;
    pointerStart.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start || stateRef.current.status !== "playing") return;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (absDx < 24 && absDy < 24) return;

    if (absDx > absDy) {
      applyDirection(dx > 0 ? "right" : "left");
    } else {
      applyDirection(dy > 0 ? "down" : "up");
    }
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

  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <div
        ref={frameRef}
        tabIndex={0}
        className={`relative cursor-pointer overflow-hidden rounded-[2.75rem] border-2 border-white/10 touch-none select-none outline-none ${
          isWallShakeFx ? "animate-[worm-shake_360ms_ease-in-out_1]" : ""
        }`}
        style={{ width: PHONE_WIDTH, height: PHONE_HEIGHT }}
        aria-label={
          gameOver
            ? "Worm — press a key to restart"
            : isReady
              ? "Worm — press a key to start"
              : "Worm — snake game"
        }
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <div
          className="pointer-events-none absolute left-1/2 top-8 z-10 -translate-x-1/2 text-4xl font-light tabular-nums tracking-tight text-foreground"
          aria-live="polite"
        >
          <NumberFlow value={score} />
        </div>

        <canvas ref={canvasRef} className="absolute inset-0 block" />

        {isReady && (
          <p className="pointer-events-none absolute inset-x-0 bottom-10 z-10 text-center text-sm text-muted-foreground">
            Press a key to start
          </p>
        )}

        {gameOver && (
          <p className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-sm text-muted-foreground">
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
