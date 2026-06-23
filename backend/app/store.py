import os
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from sqlalchemy import (
    BigInteger,
    JSON,
    Boolean,
    ForeignKey,
    Integer,
    String,
    create_engine,
    delete,
    select,
    text,
)
from sqlalchemy.engine import URL, make_url
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

from app.models import ActiveGameSnapshot, GameMode, Point, ScoreEntry, User
from app.security import hash_password


ACTIVE_GAME_TTL_MS = 15_000
DEFAULT_DATABASE_PATH = Path(__file__).resolve().parents[1] / "snake_royale.db"


def now_ms() -> int:
    return int(time.time() * 1000)


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


class Base(DeclarativeBase):
    pass


class UserRow(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    username: Mapped[str] = mapped_column(String, nullable=False)
    username_normalized: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)


class SessionRow(Base):
    __tablename__ = "sessions"

    token: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)


class ScoreRow(Base):
    __tablename__ = "scores"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    username: Mapped[str] = mapped_column(String, nullable=False)
    mode: Mapped[str] = mapped_column(String, nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)


class ActiveGameRow(Base):
    __tablename__ = "active_games"

    game_id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    username: Mapped[str] = mapped_column(String, nullable=False)
    mode: Mapped[str] = mapped_column(String, nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    snake: Mapped[list[dict[str, int]]] = mapped_column(JSON, nullable=False)
    food: Mapped[dict[str, int]] = mapped_column(JSON, nullable=False)
    width: Mapped[int] = mapped_column(Integer, nullable=False)
    height: Mapped[int] = mapped_column(Integer, nullable=False)
    alive: Mapped[bool] = mapped_column(Boolean, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)


@dataclass(frozen=True)
class StoredUser:
    id: str
    username: str
    password_hash: str

    def to_public(self) -> User:
        return User(id=self.id, username=self.username)


class DatabaseStore:
    def __init__(self, database_url: str | None = None) -> None:
        raw_url = database_url or os.environ.get(
            "SNAKE_ROYALE_DATABASE_URL",
            f"sqlite:///{DEFAULT_DATABASE_PATH}",
        )
        url = normalize_database_url(raw_url)
        self.engine = create_engine(
            url,
            connect_args=connect_args_for_url(url),
        )
        self.session_factory = sessionmaker(self.engine, expire_on_commit=False)
        Base.metadata.create_all(self.engine)
        self.upgrade_schema()
        self.seed_if_empty()

    def _session(self) -> Session:
        return self.session_factory()

    def upgrade_schema(self) -> None:
        if self.engine.dialect.name != "postgresql":
            return

        with self.engine.begin() as connection:
            connection.execute(text("ALTER TABLE scores ALTER COLUMN created_at TYPE BIGINT"))
            connection.execute(
                text("ALTER TABLE active_games ALTER COLUMN updated_at TYPE BIGINT")
            )

    def find_user_by_username(self, username: str) -> StoredUser | None:
        normalized = normalize_username(username)
        with self._session() as session:
            row = session.scalar(
                select(UserRow).where(UserRow.username_normalized == normalized)
            )
            return stored_user_from_row(row) if row is not None else None

    def get_user(self, user_id: str) -> StoredUser | None:
        with self._session() as session:
            row = session.get(UserRow, user_id)
            return stored_user_from_row(row) if row is not None else None

    def add_user(self, username: str, password_hash: str) -> User:
        row = UserRow(
            id=new_id("usr"),
            username=username,
            username_normalized=normalize_username(username),
            password_hash=password_hash,
        )
        with self._session() as session:
            session.add(row)
            session.commit()
        return User(id=row.id, username=row.username)

    def create_session(self, token: str, user_id: str) -> None:
        with self._session() as session:
            session.add(SessionRow(token=token, user_id=user_id))
            session.commit()

    def revoke_session(self, token: str) -> None:
        with self._session() as session:
            session.execute(delete(SessionRow).where(SessionRow.token == token))
            session.commit()

    def get_session_user_id(self, token: str) -> str | None:
        with self._session() as session:
            row = session.get(SessionRow, token)
            return row.user_id if row is not None else None

    def add_score(self, entry: ScoreEntry) -> None:
        with self._session() as session:
            session.add(score_row_from_entry(entry))
            session.commit()

    def list_scores(self, mode: GameMode, limit: int) -> list[ScoreEntry]:
        with self._session() as session:
            rows = session.scalars(
                select(ScoreRow)
                .where(ScoreRow.mode == mode.value)
                .order_by(ScoreRow.score.desc(), ScoreRow.created_at.asc())
                .limit(limit)
            ).all()
            return [score_entry_from_row(row) for row in rows]

    def upsert_active_game(self, snapshot: ActiveGameSnapshot) -> None:
        with self._session() as session:
            row = session.get(ActiveGameRow, snapshot.gameId)
            values = active_game_values(snapshot)
            if row is None:
                session.add(ActiveGameRow(**values))
            else:
                for key, value in values.items():
                    setattr(row, key, value)
            session.commit()

    def list_active_games(self) -> list[ActiveGameSnapshot]:
        self.prune_active_games()
        with self._session() as session:
            rows = session.scalars(
                select(ActiveGameRow).order_by(ActiveGameRow.updated_at.desc())
            ).all()
            return [active_game_from_row(row) for row in rows]

    def get_active_game(self, game_id: str) -> ActiveGameSnapshot | None:
        self.prune_active_games()
        with self._session() as session:
            row = session.get(ActiveGameRow, game_id)
            return active_game_from_row(row) if row is not None else None

    def delete_active_game(self, game_id: str) -> None:
        with self._session() as session:
            session.execute(delete(ActiveGameRow).where(ActiveGameRow.game_id == game_id))
            session.commit()

    def reset(self) -> None:
        with self._session() as session:
            for table in (ActiveGameRow, ScoreRow, SessionRow, UserRow):
                session.execute(delete(table))
            session.commit()
        seed_store(self)

    def seed_if_empty(self) -> None:
        with self._session() as session:
            has_users = session.scalar(select(UserRow.id).limit(1)) is not None
        if not has_users:
            seed_store(self)

    def prune_active_games(self) -> None:
        cutoff = now_ms() - ACTIVE_GAME_TTL_MS
        with self._session() as session:
            session.execute(
                delete(ActiveGameRow).where(
                    (ActiveGameRow.alive.is_(False)) | (ActiveGameRow.updated_at < cutoff)
                )
            )
            session.commit()


def normalize_username(username: str) -> str:
    return username.strip().casefold()


def normalize_database_url(database_url: str) -> URL:
    url = make_url(database_url)
    if url.drivername in {"postgres", "postgresql"}:
        return url.set(drivername="postgresql+psycopg")
    return url


def connect_args_for_url(url: URL) -> dict[str, bool]:
    if url.drivername.startswith("sqlite"):
        return {"check_same_thread": False}
    return {}


def stored_user_from_row(row: UserRow) -> StoredUser:
    return StoredUser(id=row.id, username=row.username, password_hash=row.password_hash)


def score_row_from_entry(entry: ScoreEntry) -> ScoreRow:
    return ScoreRow(
        id=entry.id,
        user_id=entry.userId,
        username=entry.username,
        mode=entry.mode.value,
        score=entry.score,
        created_at=entry.createdAt,
    )


def score_entry_from_row(row: ScoreRow) -> ScoreEntry:
    return ScoreEntry(
        id=row.id,
        userId=row.user_id,
        username=row.username,
        mode=GameMode(row.mode),
        score=row.score,
        createdAt=row.created_at,
    )


def active_game_values(snapshot: ActiveGameSnapshot) -> dict[str, Any]:
    return {
        "game_id": snapshot.gameId,
        "user_id": snapshot.userId,
        "username": snapshot.username,
        "mode": snapshot.mode.value,
        "score": snapshot.score,
        "snake": [point.model_dump() for point in snapshot.snake],
        "food": snapshot.food.model_dump(),
        "width": snapshot.width,
        "height": snapshot.height,
        "alive": snapshot.alive,
        "updated_at": snapshot.updatedAt,
    }


def active_game_from_row(row: ActiveGameRow) -> ActiveGameSnapshot:
    return ActiveGameSnapshot(
        gameId=row.game_id,
        userId=row.user_id,
        username=row.username,
        mode=GameMode(row.mode),
        score=row.score,
        snake=[Point(**point) for point in row.snake],
        food=Point(**row.food),
        width=row.width,
        height=row.height,
        alive=row.alive,
        updatedAt=row.updated_at,
    )


def seed_store(target: DatabaseStore) -> None:
    users = [
        target.add_user("alice", hash_password("password123")),
        target.add_user("bruno", hash_password("password123")),
        target.add_user("casey", hash_password("password123")),
    ]
    timestamp = now_ms()
    for entry in [
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
    ]:
        target.add_score(entry)
    target.upsert_active_game(
        ActiveGameSnapshot(
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
    )

    target.upsert_active_game(
        ActiveGameSnapshot(
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
    )


store = DatabaseStore()
