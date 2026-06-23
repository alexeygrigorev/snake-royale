from fastapi import APIRouter, Depends, Query, status

from app.auth import require_user
from app.models import GameMode, ScoreEntry, SubmitScoreRequest, User
from app.store import new_id, now_ms, store

router = APIRouter(tags=["Scores"])


@router.post("/scores", response_model=ScoreEntry, status_code=status.HTTP_201_CREATED)
async def submit_score(
    payload: SubmitScoreRequest,
    user: User = Depends(require_user),
) -> ScoreEntry:
    entry = ScoreEntry(
        id=new_id("score"),
        userId=user.id,
        username=user.username,
        mode=payload.mode,
        score=payload.score,
        createdAt=now_ms(),
    )
    store.add_score(entry)
    return entry


@router.get("/leaderboard", response_model=list[ScoreEntry])
async def get_leaderboard(
    mode: GameMode,
    limit: int = Query(default=10, ge=1),
) -> list[ScoreEntry]:
    return store.list_scores(mode, limit)
