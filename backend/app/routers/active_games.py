from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.auth import require_user
from app.models import ActiveGameSnapshot, ActiveGameSummary, User
from app.store import store

router = APIRouter(prefix="/active-games", tags=["Active Games"])


@router.get("", response_model=list[ActiveGameSummary])
async def list_active_games() -> list[ActiveGameSummary]:
    return [
        ActiveGameSummary(
            gameId=game.gameId,
            username=game.username,
            mode=game.mode,
            score=game.score,
            updatedAt=game.updatedAt,
        )
        for game in store.list_active_games()
    ]


@router.put("", status_code=status.HTTP_204_NO_CONTENT)
async def publish_game_state(
    snapshot: ActiveGameSnapshot,
    user: User = Depends(require_user),
) -> Response:
    stored = snapshot.model_copy(update={"userId": user.id, "username": user.username})
    store.upsert_active_game(stored)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{game_id}", response_model=ActiveGameSnapshot)
async def watch_game(game_id: str) -> ActiveGameSnapshot:
    game = store.get_active_game(game_id)
    if game is None:
        raise HTTPException(status_code=404, detail="Active game not found")
    return game


@router.delete("/{game_id}", status_code=status.HTTP_204_NO_CONTENT)
async def end_game(
    game_id: str,
    _: User = Depends(require_user),
) -> Response:
    store.delete_active_game(game_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
