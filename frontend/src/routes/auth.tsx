import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Snake" },
      { name: "description", content: "Log in or sign up to play Snake and save your scores." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { login, signup, user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-muted-foreground">
          You're signed in as <span className="font-medium text-foreground">{user.username}</span>.
        </p>
        <button
          className="mt-4 rounded-md bg-primary px-4 py-2 text-primary-foreground"
          onClick={() => navigate({ to: "/play" })}
        >
          Go play
        </button>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") await login(username, password);
      else await signup(username, password);
      navigate({ to: "/play" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex rounded-md border border-border p-1 text-sm">
          <button
            type="button"
            className={`flex-1 rounded-sm py-1.5 ${mode === "login" ? "bg-primary text-primary-foreground" : ""}`}
            onClick={() => setMode("login")}
          >
            Log in
          </button>
          <button
            type="button"
            className={`flex-1 rounded-sm py-1.5 ${mode === "signup" ? "bg-primary text-primary-foreground" : ""}`}
            onClick={() => setMode("signup")}
          >
            Sign up
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-sm font-medium" htmlFor="username">Username</label>
            <input
              id="username"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? "…" : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}