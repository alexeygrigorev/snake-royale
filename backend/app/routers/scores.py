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
    store.scores.append(entry)
    return entry


@router.get("/leaderboard", response_model=list[ScoreEntry])
async def get_leaderboard(
    mode: GameMode,
    limit: int = Query(default=10, ge=1),
) -> list[ScoreEntry]:
    return sorted(
        (score for score in store.scores if score.mode == mode),
        key=lambda score: (-score.score, score.createdAt),
    )[:limit]
