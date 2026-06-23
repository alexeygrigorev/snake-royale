import type {
  ActiveGameSnapshot,
  ActiveGameSummary,
  AuthResult,
  GameMode,
  ScoreEntry,
  Services,
  User,
} from "./types";

const DEFAULT_API_BASE_URL = import.meta.env.DEV ? "/api" : "http://localhost:8000";
const WATCH_POLL_MS = 500;

interface ErrorResponse {
  message?: string;
}

export interface HttpServicesOptions {
  baseUrl?: string;
  fetcher?: typeof fetch;
}

function getDefaultBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as ErrorResponse;
    if (payload.message) return payload.message;
  } catch {
    // Fall through to the HTTP status text below.
  }
  return response.statusText || "Request failed";
}

export function createHttpServices(opts: HttpServicesOptions = {}): Services {
  const baseUrl = trimTrailingSlash(opts.baseUrl ?? getDefaultBaseUrl());
  const fetcher = opts.fetcher ?? fetch;

  async function request<T>(
    path: string,
    init: RequestInit = {},
    options: { allowNoContent?: boolean } = {},
  ): Promise<T> {
    const headers = new Headers(init.headers);
    if (init.body !== undefined && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetcher(`${baseUrl}${path}`, {
      ...init,
      headers,
      credentials: "include",
    });

    if (response.status === 204 && options.allowNoContent) {
      return null as T;
    }

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  async function auth(path: "/auth/signup" | "/auth/login", username: string, password: string) {
    return request<AuthResult>(path, {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  }

  return {
    signup(username, password) {
      return auth("/auth/signup", username, password);
    },

    login(username, password) {
      return auth("/auth/login", username, password);
    },

    async logout() {
      try {
        await request<void>("/auth/logout", { method: "POST" });
      } catch (error) {
        if (error instanceof Error && /authentication is required/i.test(error.message)) {
          return;
        }
        throw error;
      }
    },

    currentUser() {
      return request<User | null>("/auth/me", {}, { allowNoContent: true });
    },

    submitScore(mode: GameMode, score: number) {
      return request<ScoreEntry>("/scores", {
        method: "POST",
        body: JSON.stringify({ mode, score }),
      });
    },

    getLeaderboard(mode: GameMode, limit = 10) {
      const params = new URLSearchParams({ mode, limit: String(limit) });
      return request<ScoreEntry[]>(`/leaderboard?${params.toString()}`);
    },

    publishGameState(snapshot: ActiveGameSnapshot) {
      return request<void>("/active-games", {
        method: "PUT",
        body: JSON.stringify(snapshot),
      });
    },

    endGame(gameId: string) {
      return request<void>(`/active-games/${encodeURIComponent(gameId)}`, {
        method: "DELETE",
      });
    },

    listActiveGames() {
      return request<ActiveGameSummary[]>("/active-games");
    },

    watchGame(gameId, onUpdate) {
      let stopped = false;

      const load = async () => {
        try {
          const snapshot = await request<ActiveGameSnapshot>(
            `/active-games/${encodeURIComponent(gameId)}`,
          );
          if (!stopped) onUpdate(snapshot);
        } catch (error) {
          if (stopped) return;
          if (error instanceof Error && /active game not found/i.test(error.message)) {
            onUpdate(null);
            return;
          }
          onUpdate(null);
        }
      };

      void load();
      const interval = setInterval(() => {
        void load();
      }, WATCH_POLL_MS);

      return () => {
        stopped = true;
        clearInterval(interval);
      };
    },
  };
}
