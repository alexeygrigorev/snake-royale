import type { GameMode } from "@/services/types";

export type Direction = "up" | "down" | "left" | "right";

export interface Point {
  x: number;
  y: number;
}

export interface GameState {
  width: number;
  height: number;
  mode: GameMode;
  snake: Point[]; // head first
  dir: Direction;
  pendingDir: Direction;
  food: Point;
  alive: boolean;
  score: number;
}

const DIRS: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

export function createGame(
  mode: GameMode,
  width = 20,
  height = 20,
  rand: () => number = Math.random,
): GameState {
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  const snake: Point[] = [
    { x: cx, y: cy },
    { x: cx - 1, y: cy },
    { x: cx - 2, y: cy },
  ];
  return {
    width,
    height,
    mode,
    snake,
    dir: "right",
    pendingDir: "right",
    food: placeFood(snake, width, height, rand),
    alive: true,
    score: 0,
  };
}

export function placeFood(
  snake: Point[],
  width: number,
  height: number,
  rand: () => number = Math.random,
): Point {
  const occupied = new Set(snake.map((p) => `${p.x},${p.y}`));
  const free: Point[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!occupied.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  if (free.length === 0) return { x: 0, y: 0 };
  return free[Math.floor(rand() * free.length)];
}

export function turn(state: GameState, dir: Direction): GameState {
  if (dir === OPPOSITE[state.dir]) return state; // ignore 180°
  return { ...state, pendingDir: dir };
}

export function tick(state: GameState, rand: () => number = Math.random): GameState {
  if (!state.alive) return state;
  const dir = state.pendingDir;
  const head = state.snake[0];
  const delta = DIRS[dir];
  let nx = head.x + delta.x;
  let ny = head.y + delta.y;

  if (state.mode === "wrap") {
    nx = (nx + state.width) % state.width;
    ny = (ny + state.height) % state.height;
  } else if (nx < 0 || ny < 0 || nx >= state.width || ny >= state.height) {
    return { ...state, alive: false, dir };
  }

  const ate = nx === state.food.x && ny === state.food.y;
  const newSnake: Point[] = [{ x: nx, y: ny }, ...state.snake];
  if (!ate) newSnake.pop();

  // self-collision (excluding the new head itself)
  for (let i = 1; i < newSnake.length; i++) {
    if (newSnake[i].x === nx && newSnake[i].y === ny) {
      return { ...state, alive: false, dir };
    }
  }

  return {
    ...state,
    dir,
    snake: newSnake,
    score: state.score + (ate ? 1 : 0),
    food: ate ? placeFood(newSnake, state.width, state.height, rand) : state.food,
  };
}