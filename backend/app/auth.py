from fastapi import Cookie, HTTPException, status
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.config import get_settings

SESSION_COOKIE_NAME = "admin_session"
SESSION_MAX_AGE_SECONDS = 60 * 60 * 8  # 8 hours
SESSION_VALUE = "admin"


def _serializer() -> URLSafeTimedSerializer:
    settings = get_settings()
    return URLSafeTimedSerializer(settings.session_secret, salt="admin-session")


def create_session_token() -> str:
    return _serializer().dumps(SESSION_VALUE)


def verify_admin_password(password: str) -> bool:
    settings = get_settings()
    return password == settings.admin_password


async def require_admin_session(admin_session: str | None = Cookie(default=None)) -> None:
    if admin_session is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        value = _serializer().loads(admin_session, max_age=SESSION_MAX_AGE_SECONDS)
    except (BadSignature, SignatureExpired) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired") from exc
    if value != SESSION_VALUE:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
