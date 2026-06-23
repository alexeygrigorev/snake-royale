import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { services } from "@/services";
import type { GameMode } from "@/services/types";
import { SnakeBoard } from "@/components/SnakeBoard";
import {
  createGame,
  tick,
  turn,
  type Direction,
  type GameState,
} from "@/lib/snake/engine";

export const Route = createFileRoute("/play")({
  head: () => ({
    meta: [
      { title: "Play Snake" },
      { name: "description", content: "Play Snake in walls or pass-through mode." },
    ],
  }),
  component: PlayPage,
});

const TICK_MS = 110;
const KEYS: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
};

function PlayPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<GameMode>("walls");
  const [state, setState] = useState<GameState>(() => createGame("walls"));
  const [running, setRunning] = useState(false);
  const gameIdRef = useRef<string>(crypto.randomUUID());
  const submittedRef = useRef(false);

  const reset = useCallback((m: GameMode) => {
    setState(createGame(m));
    gameIdRef.current = crypto.randomUUID();
    submittedRef.current = false;
    setRunning(false);
  }, []);

  // Game loop
  useEffect(() => {
    if (!running || !state.alive) return;
    const id = setInterval(() => {
      setState((s) => tick(s));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [running, state.alive]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const d = KEYS[e.key];
      if (d) {
        e.preventDefault();
        setState((s) => turn(s, d));
      } else if (e.key === " ") {
        e.preventDefault();
        setRunning((r) => !r);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Publish active game state for spectators
  useEffect(() => {
    if (!user) return;
    if (!running && state.score === 0) return;
    services.publishGameState({
      gameId: gameIdRef.current,
      userId: user.id,
      username: user.username,
      mode: state.mode,
      score: state.score,
      snake: state.snake,
      food: state.food,
      width: state.width,
      height: state.height,
      alive: state.alive && running,
      updatedAt: Date.now(),
    });
  }, [state, running, user]);

  // Submit final score once
  useEffect(() => {
    if (!state.alive && !submittedRef.current && user && state.score > 0) {
      submittedRef.current = true;
      services.submitScore(state.mode, state.score).catch(() => {});
      services.endGame(gameIdRef.current).catch(() => {});
    }
  }, [state.alive, state.score, state.mode, user]);

  const onModeChange = (m: GameMode) => {
    setMode(m);
    reset(m);
  };

  const statusBadge = useMemo(() => {
    if (!state.alive) return "Game over";
    if (!running) return "Paused — press Space";
    return "Playing";
  }, [state.alive, running]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Play</h1>
          <p className="text-sm text-muted-foreground">
            Arrow keys or WASD to move. Space to pause / resume.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <ModePicker mode={mode} onChange={onModeChange} />
        </div>
      </div>

      {!user && (
        <div className="mb-4 rounded-md border border-border bg-card p-3 text-sm">
          You're playing as a guest — <Link to="/auth" className="underline">sign in</Link>{" "}
          to save scores and be spectated.
        </div>
      )}

      <div className="flex flex-col items-center gap-4">
        <div className="flex w-full items-center justify-between text-sm">
          <span className="font-medium">Score: {state.score}</span>
          <span className="text-muted-foreground">{statusBadge}</span>
        </div>
        <SnakeBoard state={state} />
        <div className="flex gap-2">
          {state.alive ? (
            <button
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
              onClick={() => setRunning((r) => !r)}
            >
              {running ? "Pause" : "Start"}
            </button>
          ) : (
            <button
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
              onClick={() => reset(mode)}
            >
              Play again
            </button>
          )}
          <button
            className="rounded-md border border-input px-4 py-2 hover:bg-accent"
            onClick={() => reset(mode)}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

function ModePicker({
  mode,
  onChange,
}: {
  mode: GameMode;
  onChange: (m: GameMode) => void;
}) {
  return (
    <div className="flex rounded-md border border-border p-1">
      <button
        className={`rounded-sm px-3 py-1.5 ${mode === "walls" ? "bg-primary text-primary-foreground" : ""}`}
        onClick={() => onChange("walls")}
      >
        Walls
      </button>
      <button
        className={`rounded-sm px-3 py-1.5 ${mode === "wrap" ? "bg-primary text-primary-foreground" : ""}`}
        onClick={() => onChange("wrap")}
      >
        Pass-through
      </button>
    </div>
  );
}