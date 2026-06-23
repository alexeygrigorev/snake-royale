import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { services } from "@/services";
import type { ActiveGameSummary } from "@/services/types";

export const Route = createFileRoute("/watch")({
  head: () => ({
    meta: [
      { title: "Watch live — Snake" },
      { name: "description", content: "Spectate live Snake games from other players." },
    ],
  }),
  component: WatchLayout,
});

function WatchLayout() {
  const matchRoute = useMatchRoute();
  const isChild = matchRoute({ to: "/watch/$gameId" });
  if (isChild) return <Outlet />;
  return <WatchIndex />;
}

function WatchIndex() {
  const [games, setGames] = useState<ActiveGameSummary[]>([]);
  useEffect(() => {
    const load = () => services.listActiveGames().then(setGames);
    load();
    const id = setInterval(load, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold">Live games</h1>
      {games.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No one is playing right now. Open another tab and start a game!
        </p>
      ) : (
        <ul className="space-y-2">
          {games.map((g) => (
            <li
              key={g.gameId}
              className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
            >
              <div>
                <div className="font-medium">{g.username}</div>
                <div className="text-xs text-muted-foreground">
                  {g.mode === "walls" ? "Walls" : "Pass-through"} · score {g.score}
                </div>
              </div>
              <Link
                to="/watch/$gameId"
                params={{ gameId: g.gameId }}
                className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90"
              >
                Watch
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}