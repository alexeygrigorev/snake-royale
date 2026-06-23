export type GameMode = "walls" | "wrap";

export interface User {
  id: string;
  username: string;
}

export interface ScoreEntry {
  id: string;
  userId: string;
  username: string;
  mode: GameMode;
  score: number;
  createdAt: number;
}

export interface ActiveGameSnapshot {
  gameId: string;
  userId: string;
  username: string;
  mode: GameMode;
  score: number;
  snake: Array<{ x: number; y: number }>;
  food: { x: number; y: number };
  width: number;
  height: number;
  alive: boolean;
  updatedAt: number;
}

export interface ActiveGameSummary {
  gameId: string;
  username: string;
  mode: GameMode;
  score: number;
  updatedAt: number;
}

export interface AuthResult {
  user: User;
}

export interface Services {
  // Auth
  signup(username: string, password: string): Promise<AuthResult>;
  login(username: string, password: string): Promise<AuthResult>;
  logout(): Promise<void>;
  currentUser(): Promise<User | null>;

  // Scores
  submitScore(mode: GameMode, score: number): Promise<ScoreEntry>;
  getLeaderboard(mode: GameMode, limit?: number): Promise<ScoreEntry[]>;

  // Active games (spectating)
  publishGameState(snapshot: ActiveGameSnapshot): Promise<void>;
  endGame(gameId: string): Promise<void>;
  listActiveGames(): Promise<ActiveGameSummary[]>;
  watchGame(
    gameId: string,
    onUpdate: (snap: ActiveGameSnapshot | null) => void,
  ): () => void;
}