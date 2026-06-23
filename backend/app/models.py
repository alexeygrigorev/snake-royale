from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, Field


class GameMode(StrEnum):
    walls = "walls"
    wrap = "wrap"


class User(BaseModel):
    id: str
    username: str


class AuthCredentials(BaseModel):
    username: Annotated[str, Field(min_length=1)]
    password: Annotated[str, Field(min_length=1)]


class AuthResult(BaseModel):
    user: User
    token: str
    tokenType: str = "bearer"


class ScoreEntry(BaseModel):
    id: str
    userId: str
    username: str
    mode: GameMode
    score: Annotated[int, Field(ge=0)]
    createdAt: int


class SubmitScoreRequest(BaseModel):
    mode: GameMode
    score: Annotated[int, Field(ge=0)]


class Point(BaseModel):
    x: int
    y: int


class ActiveGameSnapshot(BaseModel):
    gameId: str
    userId: str
    username: str
    mode: GameMode
    score: Annotated[int, Field(ge=0)]
    snake: list[Point]
    food: Point
    width: Annotated[int, Field(ge=1)]
    height: Annotated[int, Field(ge=1)]
    alive: bool
    updatedAt: int


class ActiveGameSummary(BaseModel):
    gameId: str
    username: str
    mode: GameMode
    score: Annotated[int, Field(ge=0)]
    updatedAt: int


class ErrorResponse(BaseModel):
    message: str
