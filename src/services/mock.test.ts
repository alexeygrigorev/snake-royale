import { describe, it, expect, beforeEach } from "vitest";
import { createMockServices, MemoryStore } from "./mock";
import type { Services } from "./types";

let svc: Services;

beforeEach(() => {
  svc = createMockServices({ store: new MemoryStore() });
});

describe("mock services — auth", () => {
  it("signs up, returns user, and persists current session", async () => {
    const r = await svc.signup("alice", "secret");
    expect(r.user.username).toBe("alice");
    const me = await svc.currentUser();
    expect(me?.username).toBe("alice");
  });

  it("rejects duplicate usernames", async () => {
    await svc.signup("bob", "secret");
    await expect(svc.signup("bob", "other")).rejects.toThrow(/taken/i);
  });

  it("logs in with correct credentials and rejects wrong ones", async () => {
    await svc.signup("carol", "hunter2");
    await svc.logout();
    expect(await svc.currentUser()).toBeNull();
    await expect(svc.login("carol", "wrong")).rejects.toThrow(/invalid/i);
    const r = await svc.login("carol", "hunter2");
    expect(r.user.username).toBe("carol");
  });
});

describe("mock services — scores", () => {
  it("requires login to submit", async () => {
    await expect(svc.submitScore("walls", 5)).rejects.toThrow(/auth/i);
  });

  it("returns leaderboards sorted by score per mode", async () => {
    await svc.signup("a", "pass");
    await svc.submitScore("walls", 3);
    await svc.submitScore("walls", 10);
    await svc.submitScore("wrap", 7);
    const walls = await svc.getLeaderboard("walls");
    expect(walls.map((s) => s.score)).toEqual([10, 3]);
    const wrap = await svc.getLeaderboard("wrap");
    expect(wrap.map((s) => s.score)).toEqual([7]);
  });
});

describe("mock services — active games", () => {
  it("lists, watches and ends active games", async () => {
    await svc.signup("spectated", "pass");
    const snap = {
      gameId: "g1",
      userId: "u1",
      username: "spectated",
      mode: "walls" as const,
      score: 4,
      snake: [{ x: 1, y: 1 }],
      food: { x: 2, y: 2 },
      width: 10,
      height: 10,
      alive: true,
      updatedAt: Date.now(),
    };
    await svc.publishGameState(snap);
    const list = await svc.listActiveGames();
    expect(list).toHaveLength(1);
    expect(list[0].gameId).toBe("g1");

    const seen: Array<unknown> = [];
    const unsub = svc.watchGame("g1", (s) => seen.push(s));
    expect(seen[0]).toMatchObject({ gameId: "g1", score: 4 });
    unsub();

    await svc.endGame("g1");
    expect(await svc.listActiveGames()).toHaveLength(0);
  });
});