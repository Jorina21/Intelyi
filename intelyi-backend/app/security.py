import secrets
from dataclasses import dataclass

from fastapi import Header, HTTPException, status

from .settings import settings

INTERNAL_TOKEN_HEADER = "X-Intelyi-Internal-Token"
INTERNAL_USER_ID_HEADER = "X-Intelyi-User-Id"


@dataclass(frozen=True)
class TrustedProxyContext:
    is_trusted: bool
    user_id: str | None = None


def forbidden(detail: str = "Forbidden") -> HTTPException:
    return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


def conflict(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)


def _is_trusted_token(token: str | None) -> bool:
    if not token or not settings.INTERNAL_API_TOKEN:
        return False
    return secrets.compare_digest(token, settings.INTERNAL_API_TOKEN)


def get_trusted_proxy_context(
    x_intelyi_internal_token: str | None = Header(default=None, alias=INTERNAL_TOKEN_HEADER),
    x_intelyi_user_id: str | None = Header(default=None, alias=INTERNAL_USER_ID_HEADER),
) -> TrustedProxyContext:
    is_trusted = _is_trusted_token(x_intelyi_internal_token)

    if x_intelyi_user_id and not is_trusted:
        raise forbidden("Authenticated user context requires a trusted proxy")

    return TrustedProxyContext(
        is_trusted=is_trusted,
        user_id=x_intelyi_user_id if is_trusted else None,
    )


def require_admin_request(
    x_intelyi_internal_token: str | None = Header(default=None, alias=INTERNAL_TOKEN_HEADER),
) -> None:
    if not _is_trusted_token(x_intelyi_internal_token):
        raise forbidden()
