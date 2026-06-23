from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field

from app.models import ActiveGameSnapshot, GameMode, Point, ScoreEntry, User


ACTIVE_GAME_TTL_MS = 15_000


def now_ms() -> int:
    return int(time.time() * 1000)


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


@dataclass
class StoredUser:
    id: str
    username: str
    password_hash: str

    def to_public(self) -> User:
        return User(id=self.id, username=self.username)


@dataclass
class InMemoryStore:
    users: dict[str, StoredUser] = field(default_factory=dict)
    sessions: dict[str, str] = field(default_factory=dict)
    scores: list[ScoreEntry] = field(default_factory=list)
    active_games: dict[str, ActiveGameSnapshot] = field(default_factory=dict)

    def find_user_by_username(self, username: str) -> StoredUser | None:
        normalized = username.strip().casefold()
        return next(
            (user for user in self.users.values() if user.username.casefold() == normalized),
            None,
        )

    def add_user(self, username: str, password_hash: str) -> User:
        user = StoredUser(id=new_id("usr"), username=username, password_hash=password_hash)
        self.users[user.id] = user
        return user.to_public()

    def reset(self) -> None:
        self.users.clear()
        self.sessions.clear()
        self.scores.clear()
        self.active_games.clear()
        seed_store(self)

    def prune_active_games(self) -> None:
        cutoff = now_ms() - ACTIVE_GAME_TTL_MS
        expired = [
            game_id
            for game_id, game in self.active_games.items()
            if not game.alive or game.updatedAt < cutoff
        ]
        for game_id in expired:
            self.active_games.pop(game_id, None)


store = InMemoryStore()


def seed_store(target: InMemoryStore) -> None:
    from app.security import hash_password

    users = [
        target.add_user("alice", hash_password("password123")),
        target.add_user("bruno", hash_password("password123")),
        target.add_user("casey", hash_password("password123")),
    ]
    timestamp = now_ms()
    target.scores.extend(
        [
            ScoreEntry(
                id=new_id("score"),
                userId=users[0].id,
                username=users[0].username,
                mode=GameMode.walls,
                score=42,
                createdAt=timestamp - 80_000,
            ),
            ScoreEntry(
                id=new_id("score"),
                userId=users[1].id,
                username=users[1].username,
                mode=GameMode.walls,
                score=67,
                createdAt=timestamp - 70_000,
            ),
            ScoreEntry(
                id=new_id("score"),
                userId=users[2].id,
                username=users[2].username,
                mode=GameMode.wrap,
                score=54,
                createdAt=timestamp - 60_000,
            ),
            ScoreEntry(
                id=new_id("score"),
                userId=users[0].id,
                username=users[0].username,
                mode=GameMode.wrap,
                score=81,
                createdAt=timestamp - 50_000,
            ),
        ]
    )
    target.active_games["game_alice_walls"] = ActiveGameSnapshot(
        gameId="game_alice_walls",
        userId=users[0].id,
        username=users[0].username,
        mode=GameMode.walls,
        score=18,
        snake=[Point(x=5, y=4), Point(x=4, y=4), Point(x=3, y=4)],
        food=Point(x=11, y=8),
        width=20,
        height=20,
        alive=True,
        updatedAt=timestamp,
    )
    target.active_games["game_casey_wrap"] = ActiveGameSnapshot(
        gameId="game_casey_wrap",
        userId=users[2].id,
        username=users[2].username,
        mode=GameMode.wrap,
        score=27,
        snake=[Point(x=9, y=11), Point(x=9, y=12), Point(x=9, y=13)],
        food=Point(x=2, y=16),
        width=20,
        height=20,
        alive=True,
        updatedAt=timestamp - 1_000,
    )


seed_store(store)
