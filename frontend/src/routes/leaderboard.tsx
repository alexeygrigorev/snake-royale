import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { services } from "@/services";
import type { GameMode, ScoreEntry } from "@/services/types";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — Snake" },
      { name: "description", content: "Top Snake scores per mode." },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const [mode, setMode] = useState<GameMode>("walls");
  const [rows, setRows] = useState<ScoreEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      services.getLeaderboard(mode, 25).then((r) => {
        if (!cancelled) setRows(r);
      });
    load();
    const id = setInterval(load, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [mode]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <div className="flex rounded-md border border-border p-1 text-sm">
          <button
            className={`rounded-sm px-3 py-1.5 ${mode === "walls" ? "bg-primary text-primary-foreground" : ""}`}
            onClick={() => setMode("walls")}
          >
            Walls
          </button>
          <button
            className={`rounded-sm px-3 py-1.5 ${mode === "wrap" ? "bg-primary text-primary-foreground" : ""}`}
            onClick={() => setMode("wrap")}
          >
            Pass-through
          </button>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No scores yet for this mode. Play a game!
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">Player</th>
                <th className="px-4 py-2 text-right">Score</th>
                <th className="px-4 py-2 text-right">When</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-2">{i + 1}</td>
                  <td className="px-4 py-2 font-medium">{r.username}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.score}</td>
                  <td className="px-4 py-2 text-right text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}