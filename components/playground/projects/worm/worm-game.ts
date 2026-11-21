export type Direction = "up" | "down" | "left" | "right";
export type Point = { x: number; y: number };
export type GameStatus = "ready" | "playing" | "over" | "won";
export type DeathCause = "wall" | "self";

/** Score tier: small=2, big=5, logo=10 (W mark). */
export type FoodKind = "small" | "big" | "logo";

/** You're-in physics props used as random visuals for small/big. */
export type FoodPiece =
  | "football"
  | "alien"
  | "gold-e"
  | "tennis"
  | "golf"
  | "flag-r"
  | "marble-n"
  | "arrow"
  | "crystal-a"
  | "cash"
  | "soccer";

export type Food = Point & { kind: FoodKind; piece: FoodPiece | "logo-w" };

export const GRID_COLS = 17;
export const GRID_ROWS = 29;
export const CELL_SIZE = 20;
export const TICK_MS = 130;
export const INITIAL_LENGTH = 3;

/** Target score to unlock onboarding — 6×2 + 5×5 + 3×10. */
export const WIN_SCORE = 67;

export const FOOD_POINTS: Record<FoodKind, number> = {
  small: 2,
  big: 5,
  logo: 10,
};

export const FOOD_PIECES: FoodPiece[] = [
  "football",
  "alien",
  "gold-e",
  "tennis",
  "golf",
  "flag-r",
  "marble-n",
  "arrow",
  "crystal-a",
  "cash",
  "soccer",
];

/** Exact challenge mix: 14 pickups → 67 points. */
const CHALLENGE_COUNTS: Record<FoodKind, number> = {
  small: 6,
  big: 5,
  logo: 3,
};

export type WormGameState = {
  snake: Point[];
  direction: Direction;
  queuedDirection: Direction;
  food: Food;
  /** Remaining kinds after the current food (challenge mode). */
  deck: FoodKind[];
  score: number;
  status: GameStatus;
  deathCause?: DeathCause;
  challenge: boolean;
};

const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}

function buildChallengeDeck(): FoodKind[] {
  const deck: FoodKind[] = [];
  (Object.keys(CHALLENGE_COUNTS) as FoodKind[]).forEach((kind) => {
    for (let i = 0; i < CHALLENGE_COUNTS[kind]; i++) deck.push(kind);
  });
  return shuffle(deck);
}

function randomKind(): FoodKind {
  const roll = Math.random();
  if (roll < 0.5) return "small";
  if (roll < 0.82) return "big";
  return "logo";
}

function randomPiece(): FoodPiece {
  return FOOD_PIECES[Math.floor(Math.random() * FOOD_PIECES.length)]!;
}

function pieceForKind(kind: FoodKind): FoodPiece | "logo-w" {
  if (kind === "logo") return "logo-w";
  return randomPiece();
}

function randomEmptyCell(snake: Point[]): Point {
  const occupied = new Set(snake.map((p) => `${p.x},${p.y}`));
  const empty: Point[] = [];
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      if (!occupied.has(`${x},${y}`)) empty.push({ x, y });
    }
  }
  if (empty.length === 0) return { x: 0, y: 0 };
  return empty[Math.floor(Math.random() * empty.length)]!;
}

function spawnFood(snake: Point[], kind: FoodKind): Food {
  return {
    ...randomEmptyCell(snake),
    kind,
    piece: pieceForKind(kind),
  };
}

function takeNextFood(
  snake: Point[],
  deck: FoodKind[],
  challenge: boolean,
): { food: Food; deck: FoodKind[] } {
  if (challenge && deck.length > 0) {
    const [kind, ...rest] = deck;
    return { food: spawnFood(snake, kind!), deck: rest };
  }
  return { food: spawnFood(snake, randomKind()), deck };
}

function initialSnake(): Point[] {
  const midX = Math.floor(GRID_COLS / 2);
  const midY = Math.floor(GRID_ROWS / 2);
  const snake: Point[] = [];
  for (let i = 0; i < INITIAL_LENGTH; i++) {
    snake.push({ x: midX - i, y: midY });
  }
  return snake;
}

export function createInitialState(challenge = false): WormGameState {
  const snake = initialSnake();
  const deck = challenge ? buildChallengeDeck() : [];
  const first = takeNextFood(snake, deck, challenge);
  return {
    snake,
    direction: "right",
    queuedDirection: "right",
    food: first.food,
    deck: first.deck,
    score: 0,
    status: "ready",
    challenge,
  };
}

export function startGame(
  state: WormGameState,
  direction?: Direction,
): WormGameState {
  if (state.status === "playing") return state;
  const dir = direction ?? state.queuedDirection;
  return {
    ...state,
    status: "playing",
    direction: dir,
    queuedDirection: dir,
  };
}

export function queueDirection(
  state: WormGameState,
  next: Direction,
): WormGameState {
  if (OPPOSITE[state.direction] === next) return state;
  return { ...state, queuedDirection: next };
}

function stepPoint(p: Point, dir: Direction): Point {
  if (dir === "up") return { x: p.x, y: p.y - 1 };
  if (dir === "down") return { x: p.x, y: p.y + 1 };
  if (dir === "left") return { x: p.x - 1, y: p.y };
  return { x: p.x + 1, y: p.y };
}

export function tick(state: WormGameState): WormGameState {
  if (state.status !== "playing") return state;

  const direction = state.queuedDirection;
  const head = state.snake[0]!;
  const next = stepPoint(head, direction);

  if (
    next.x < 0 ||
    next.y < 0 ||
    next.x >= GRID_COLS ||
    next.y >= GRID_ROWS
  ) {
    return { ...state, status: "over", deathCause: "wall", direction };
  }

  const hitSelf = state.snake.some((s) => s.x === next.x && s.y === next.y);
  if (hitSelf) {
    return { ...state, status: "over", deathCause: "self", direction };
  }

  const ate = next.x === state.food.x && next.y === state.food.y;
  const snake = [next, ...state.snake];
  if (!ate) snake.pop();

  if (!ate) {
    return { ...state, snake, direction, queuedDirection: direction };
  }

  const score = state.score + FOOD_POINTS[state.food.kind];
  if (state.challenge && score >= WIN_SCORE) {
    return {
      ...state,
      snake,
      direction,
      queuedDirection: direction,
      score,
      status: "won",
      food: state.food,
      deck: [],
    };
  }

  const spawned = takeNextFood(snake, state.deck, state.challenge);
  return {
    ...state,
    snake,
    direction,
    queuedDirection: direction,
    score,
    food: spawned.food,
    deck: spawned.deck,
  };
}
