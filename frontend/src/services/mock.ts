import type {
  ActiveGameSnapshot,
  ActiveGameSummary,
  AuthResult,
  GameMode,
  ScoreEntry,
  Services,
  User,
} from "./types";

/**
 * Storage abstraction so tests can pass an in-memory map.
 * In the browser we default to localStorage.
 */
export interface KVStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export class MemoryStore implements KVStore {
  private map = new Map<string, string>();
  get(k: string) {
    return this.map.has(k) ? this.map.get(k)! : null;
  }
  set(k: string, v: string) {
    this.map.set(k, v);
  }
  remove(k: string) {
    this.map.delete(k);
  }
}

const browserStore: KVStore = {
  get: (k) => (typeof window === "undefined" ? null : window.localStorage.getItem(k)),
  set: (k, v) => {
    if (typeof window !== "undefined") window.localStorage.setItem(k, v);
  },
  remove: (k) => {
    if (typeof window !== "undefined") window.localStorage.removeItem(k);
  },
};

const KEY_USERS = "snake.users";
const KEY_SESSION = "snake.session";
const KEY_SCORES = "snake.scores";
const KEY_ACTIVE = "snake.active";

const ACTIVE_TTL_MS = 15_000;

interface StoredUser {
  id: string;
  username: string;
  passwordHash: string;
}

function hash(s: string): string {
  // Tiny non-cryptographic hash. Mock only.
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return String(h >>> 0);
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function readJSON<T>(store: KVStore, key: string, fallback: T): T {
  const raw = store.get(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(store: KVStore, key: string, value: unknown) {
  store.set(key, JSON.stringify(value));
}

export interface MockOptions {
  store?: KVStore;
  /** ms of artificial latency to mimic a real network */
  latency?: number;
}

export function createMockServices(opts: MockOptions = {}): Services {
  const store = opts.store ?? browserStore;
  const latency = opts.latency ?? 0;
  const wait = () =>
    latency > 0 ? new Promise<void>((r) => setTimeout(r, latency)) : Promise.resolve();

  const getUsers = (): StoredUser[] => readJSON<StoredUser[]>(store, KEY_USERS, []);
  const saveUsers = (u: StoredUser[]) => writeJSON(store, KEY_USERS, u);
  const getScores = (): ScoreEntry[] => readJSON<ScoreEntry[]>(store, KEY_SCORES, []);
  const saveScores = (s: ScoreEntry[]) => writeJSON(store, KEY_SCORES, s);
  const getActive = (): Record<string, ActiveGameSnapshot> =>
    readJSON(store, KEY_ACTIVE, {} as Record<string, ActiveGameSnapshot>);
  const saveActive = (a: Record<string, ActiveGameSnapshot>) =>
    writeJSON(store, KEY_ACTIVE, a);
  const getSession = (): User | null => readJSON<User | null>(store, KEY_SESSION, null);

  function pruneActive(a: Record<string, ActiveGameSnapshot>) {
    const now = Date.now();
    for (const id of Object.keys(a)) {
      if (!a[id].alive || now - a[id].updatedAt > ACTIVE_TTL_MS) delete a[id];
    }
    return a;
  }

  return {
    async signup(username, password): Promise<AuthResult> {
      await wait();
      const uname = username.trim();
      if (uname.length < 2) throw new Error("Username must be at least 2 characters");
      if (password.length < 4) throw new Error("Password must be at least 4 characters");
      const users = getUsers();
      if (users.some((u) => u.username.toLowerCase() === uname.toLowerCase()))
        throw new Error("Username already taken");
      const user: StoredUser = { id: uid(), username: uname, passwordHash: hash(password) };
      users.push(user);
      saveUsers(users);
      const session: User = { id: user.id, username: user.username };
      writeJSON(store, KEY_SESSION, session);
      return { user: session };
    },

    async login(username, password): Promise<AuthResult> {
      await wait();
      const users = getUsers();
      const u = users.find(
        (x) => x.username.toLowerCase() === username.trim().toLowerCase(),
      );
      if (!u || u.passwordHash !== hash(password)) throw new Error("Invalid credentials");
      const session: User = { id: u.id, username: u.username };
      writeJSON(store, KEY_SESSION, session);
      return { user: session };
    },

    async logout() {
      await wait();
      store.remove(KEY_SESSION);
    },

    async currentUser() {
      return getSession();
    },

    async submitScore(mode, score) {
      await wait();
      const session = getSession();
      if (!session) throw new Error("Not authenticated");
      const entry: ScoreEntry = {
        id: uid(),
        userId: session.id,
        username: session.username,
        mode,
        score,
        createdAt: Date.now(),
      };
      const all = getScores();
      all.push(entry);
      saveScores(all);
      return entry;
    },

    async getLeaderboard(mode: GameMode, limit = 10) {
      await wait();
      return getScores()
        .filter((s) => s.mode === mode)
        .sort((a, b) => b.score - a.score || a.createdAt - b.createdAt)
        .slice(0, limit);
    },

    async publishGameState(snap) {
      const a = pruneActive(getActive());
      a[snap.gameId] = snap;
      saveActive(a);
    },

    async endGame(gameId) {
      const a = getActive();
      delete a[gameId];
      saveActive(a);
    },

    async listActiveGames(): Promise<ActiveGameSummary[]> {
      const a = pruneActive(getActive());
      saveActive(a);
      return Object.values(a)
        .map((s) => ({
          gameId: s.gameId,
          username: s.username,
          mode: s.mode,
          score: s.score,
          updatedAt: s.updatedAt,
        }))
        .sort((x, y) => y.updatedAt - x.updatedAt);
    },

    watchGame(gameId, onUpdate) {
      let stopped = false;
      const tick = () => {
        if (stopped) return;
        const a = pruneActive(getActive());
        onUpdate(a[gameId] ?? null);
      };
      tick();
      const interval = setInterval(tick, 200);
      return () => {
        stopped = true;
        clearInterval(interval);
      };
    },
  };
}