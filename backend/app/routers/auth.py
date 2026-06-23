import os

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.auth import (
    SESSION_COOKIE,
    authenticate_user,
    create_session,
    optional_auth_context,
    require_auth_context,
    revoke_session,
)
from app.models import AuthCredentials, AuthResult, User
from app.security import hash_password
from app.store import store

router = APIRouter(prefix="/auth", tags=["Auth"])


def _session_cookie_secure() -> bool:
    return os.getenv("SNAKE_ROYALE_SECURE_COOKIES", "").lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        SESSION_COOKIE,
        token,
        httponly=True,
        samesite="lax",
        secure=_session_cookie_secure(),
    )


def _validate_credentials(credentials: AuthCredentials) -> tuple[str, str]:
    username = credentials.username.strip()
    if len(username) < 2:
        raise HTTPException(status_code=400, detail="Username must be at least 2 characters")
    if len(credentials.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")
    return username, credentials.password


@router.post("/signup", response_model=AuthResult)
async def signup(credentials: AuthCredentials, response: Response) -> AuthResult:
    username, password = _validate_credentials(credentials)
    if store.find_user_by_username(username) is not None:
        raise HTTPException(status_code=409, detail="Username is already taken")
    user = store.add_user(username, hash_password(password))
    token = create_session(user.id)
    _set_session_cookie(response, token)
    return AuthResult(user=user, token=token)


@router.post("/login", response_model=AuthResult)
async def login(credentials: AuthCredentials, response: Response) -> AuthResult:
    user = authenticate_user(credentials.username, credentials.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_session(user.id)
    _set_session_cookie(response, token)
    return AuthResult(user=user, token=token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response,
    context=Depends(require_auth_context),
) -> Response:
    revoke_session(context.token)
    response.delete_cookie(
        SESSION_COOKIE,
        secure=_session_cookie_secure(),
        samesite="lax",
    )
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/me", response_model=User, responses={204: {"description": "No active session"}})
async def current_user(context=Depends(optional_auth_context)) -> User | Response:
    if context is None:
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    return context.user
