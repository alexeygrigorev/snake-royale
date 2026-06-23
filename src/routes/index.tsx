import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Snake — Play, compete, spectate" },
      { name: "description", content: "Classic Snake with walls and pass-through modes. Compete on the leaderboard and watch live games." },
      { property: "og:title", content: "Snake" },
      { property: "og:description", content: "Play Snake, climb the leaderboard, and spectate live games." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-5xl font-bold tracking-tight">🐍 Snake</h1>
      <p className="mt-4 text-muted-foreground">
        Play in two modes — slam into the walls, or wrap around them. Climb the
        leaderboard. Watch live games from other players.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          to="/play"
          className="rounded-md bg-primary px-5 py-2.5 text-primary-foreground hover:bg-primary/90"
        >
          Start playing
        </Link>
        <Link
          to="/leaderboard"
          className="rounded-md border border-input px-5 py-2.5 hover:bg-accent"
        >
          Leaderboard
        </Link>
        <Link
          to="/watch"
          className="rounded-md border border-input px-5 py-2.5 hover:bg-accent"
        >
          Watch live
        </Link>
      </div>
    </div>
  );
}
