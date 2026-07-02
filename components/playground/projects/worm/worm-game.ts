export type Direction = "up" | "down" | "left" | "right";
export type Point = { x: number; y: number };
export type GameStatus = "playing" | "over";
export type DeathCause = "wall" | "self";

export const GRID_COLS = 14;
export const GRID_ROWS = 29;
export const CELL_SIZE = 20;
export const TICK_MS = 130;
export const INITIAL_LENGTH = 3;

export type WormGameState = {
  snake: Point[];
  direction: Direction;
  queuedDirection: Direction;
  food: Point;
  score: number;
  status: GameStatus;
  deathCause?: DeathCause;
};

const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

function randomFood(snake: Point[]): Point {
  const occupied = new Set(snake.map((p) => `${p.x},${p.y}`));
  const empty: Point[] = [];
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      if (!occupied.has(`${x},${y}`)) empty.push({ x, y });
    }
  }
  if (empty.length === 0) return { x: 0, y: 0 };
  return empty[Math.floor(Math.random() * empty.length)];
}

function initialSnake(): Point[] {
  const cx = Math.floor(GRID_COLS / 2);
  const cy = Math.floor(GRID_ROWS / 2);
  return Array.from({ length: INITIAL_LENGTH }, (_, i) => ({ x: cx - i, y: cy }));
}

export function createInitialState(): WormGameState {
  const snake = initialSnake();
  return {
    snake,
    direction: "right",
    queuedDirection: "right",
    food: randomFood(snake),
    score: 0,
    status: "playing",
  };
}

export function queueDirection(state: WormGameState, dir: Direction): WormGameState {
  if (state.status !== "playing") return state;
  const active = state.queuedDirection;
  if (dir === active || dir === OPPOSITE[active]) return state;
  return { ...state, queuedDirection: dir };
}

export function tick(state: WormGameState): WormGameState {
  if (state.status !== "playing") return state;

  const direction = state.queuedDirection;
  const head = state.snake[0];
  const next: Point = {
    x: head.x + (direction === "left" ? -1 : direction === "right" ? 1 : 0),
    y: head.y + (direction === "up" ? -1 : direction === "down" ? 1 : 0),
  };

  if (
    next.x < 0 ||
    next.x >= GRID_COLS ||
    next.y < 0 ||
    next.y >= GRID_ROWS
  ) {
    return { ...state, direction, status: "over", deathCause: "wall" };
  }

  if (state.snake.some((p) => p.x === next.x && p.y === next.y)) {
    return { ...state, direction, status: "over", deathCause: "self" };
  }

  const ate = next.x === state.food.x && next.y === state.food.y;
  const snake = [next, ...state.snake];
  if (!ate) snake.pop();

  return {
    snake,
    direction,
    queuedDirection: direction,
    food: ate ? randomFood(snake) : state.food,
    score: ate ? state.score + 1 : state.score,
    status: "playing",
  };
}
