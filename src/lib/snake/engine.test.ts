import { describe, it, expect } from "vitest";
import { createGame, tick, turn } from "./engine";

const noFoodRand = () => 0; // deterministic

describe("snake engine", () => {
  it("creates a game with a snake and food", () => {
    const g = createGame("walls", 10, 10, noFoodRand);
    expect(g.snake.length).toBe(3);
    expect(g.alive).toBe(true);
    expect(g.score).toBe(0);
    expect(g.food.x).toBeGreaterThanOrEqual(0);
  });

  it("moves the snake on tick", () => {
    const g = createGame("walls", 10, 10, noFoodRand);
    const head = g.snake[0];
    const next = tick(g, noFoodRand);
    expect(next.snake[0]).toEqual({ x: head.x + 1, y: head.y });
    expect(next.snake.length).toBe(3);
  });

  it("dies hitting a wall in walls mode", () => {
    let g = createGame("walls", 5, 5, noFoodRand);
    for (let i = 0; i < 10; i++) g = tick(g, noFoodRand);
    expect(g.alive).toBe(false);
  });

  it("wraps around edges in wrap mode", () => {
    let g = createGame("wrap", 5, 5, noFoodRand);
    for (let i = 0; i < 20; i++) g = tick(g, noFoodRand);
    expect(g.alive).toBe(true);
  });

  it("ignores 180° reverse direction", () => {
    const g = createGame("walls", 10, 10, noFoodRand);
    const t = turn(g, "left"); // moving right, can't go left
    expect(t.pendingDir).toBe("right");
  });

  it("grows and scores when eating food", () => {
    let g = createGame("walls", 10, 10, noFoodRand);
    // Place food right in front of the head
    g = { ...g, food: { x: g.snake[0].x + 1, y: g.snake[0].y } };
    const next = tick(g, noFoodRand);
    expect(next.score).toBe(1);
    expect(next.snake.length).toBe(4);
  });
});