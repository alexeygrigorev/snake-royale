import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { services } from "@/services";
import type { ActiveGameSnapshot } from "@/services/types";
import { SnakeBoard } from "@/components/SnakeBoard";

export const Route = createFileRoute("/watch/$gameId")({
  head: () => ({
    meta: [{ title: "Watching game — Snake" }],
  }),
  component: WatchGame,
});

function WatchGame() {
  const { gameId } = Route.useParams();
  const [snap, setSnap] = useState<ActiveGameSnapshot | null>(null);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    let lastSeen = false;
    const unsub = services.watchGame(gameId, (s) => {
      if (s) {
        lastSeen = true;
        setSnap(s);
      } else if (lastSeen) {
        setEnded(true);
      }
    });
    return unsub;
  }, [gameId]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link to="/watch" className="text-sm text-muted-foreground hover:underline">
        ← back to live games
      </Link>
      {!snap ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {ended ? "This game has ended." : "Connecting to game…"}
        </p>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-3">
          <div className="flex w-full items-center justify-between text-sm">
            <div>
              <div className="font-semibold">{snap.username}</div>
              <div className="text-xs text-muted-foreground">
                {snap.mode === "walls" ? "Walls" : "Pass-through"}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold tabular-nums">{snap.score}</div>
              <div className="text-xs text-muted-foreground">
                {ended ? "ended" : snap.alive ? "live" : "game over"}
              </div>
            </div>
          </div>
          <SnakeBoard
            state={{
              width: snap.width,
              height: snap.height,
              snake: snap.snake,
              food: snap.food,
              alive: snap.alive,
            }}
          />
        </div>
      )}
    </div>
  );
}