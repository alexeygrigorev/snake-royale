from __future__ import annotations

import secrets
from dataclasses import dataclass

from fastapi import Cookie, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.models import User
from app.security import verify_password
from app.store import store

SESSION_COOKIE = "snake.session"
_bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class AuthContext:
    user: User
    token: str


def create_session(user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    store.sessions[token] = user_id
    return token


def revoke_session(token: str) -> None:
    store.sessions.pop(token, None)


def authenticate_user(username: str, password: str) -> User | None:
    record = store.find_user_by_username(username)
    if record is None or not verify_password(password, record.password_hash):
        return None
    return record.to_public()


def _resolve_token(
    credentials: HTTPAuthorizationCredentials | None,
    session_cookie: str | None,
) -> str | None:
    if credentials and credentials.scheme.lower() == "bearer":
        return credentials.credentials
    return session_cookie


async def optional_auth_context(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    session_cookie: str | None = Cookie(default=None, alias=SESSION_COOKIE),
) -> AuthContext | None:
    token = _resolve_token(credentials, session_cookie)
    if token is None:
        return None
    user_id = store.sessions.get(token)
    if user_id is None:
        return None
    user = store.users.get(user_id)
    if user is None:
        store.sessions.pop(token, None)
        return None
    return AuthContext(user=user.to_public(), token=token)


async def require_auth_context(
    context: AuthContext | None = Depends(optional_auth_context),
) -> AuthContext:
    if context is None:
        raise HTTPException(status_code=401, detail="Authentication is required")
    return context


async def require_user(context: AuthContext = Depends(require_auth_context)) -> User:
    return context.user
