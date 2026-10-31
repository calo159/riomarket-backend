"""Utilidades para cookies HttpOnly del token de refresco."""

from __future__ import annotations

from datetime import timedelta

from django.conf import settings

REFRESH_COOKIE_NAME = "rm_refresh"
# Pista de sesión: NO es HttpOnly ni contiene nada secreto (solo "1"). Le dice al frontend si vale
# la pena pedir el refresh al arrancar; un visitante anónimo así no espera un viaje al servidor que
# terminaría en 401. La seguridad sigue en rm_refresh (HttpOnly) y en el JWT, no en esta cookie.
HINT_COOKIE_NAME = "rm_hay_sesion"


def _cookie_secure() -> bool:
    return not getattr(settings, "DEBUG", False)


def _cookie_samesite() -> str:
    return getattr(settings, "REFRESH_COOKIE_SAMESITE", "Strict")


def _cookie_domain():
    return getattr(settings, "REFRESH_COOKIE_DOMAIN", None)


def _cookie_path() -> str:
    return getattr(settings, "REFRESH_COOKIE_PATH", "/api/auth/")


def get_refresh_max_age_seconds() -> int:
    lifetime = getattr(settings, "SIMPLE_JWT", {}).get("REFRESH_TOKEN_LIFETIME")
    if isinstance(lifetime, timedelta):
        return int(lifetime.total_seconds())
    return 7 * 24 * 60 * 60


def set_session_hint_cookie(response) -> None:
    response.set_cookie(
        key=HINT_COOKIE_NAME,
        value="1",
        max_age=get_refresh_max_age_seconds(),
        expires=None,
        path="/",
        domain=_cookie_domain(),
        secure=_cookie_secure(),
        httponly=False,
        samesite=_cookie_samesite(),
    )


def clear_session_hint_cookie(response) -> None:
    response.set_cookie(
        key=HINT_COOKIE_NAME,
        value="",
        max_age=0,
        expires=0,
        path="/",
        domain=_cookie_domain(),
        secure=_cookie_secure(),
        httponly=False,
        samesite=_cookie_samesite(),
    )


def set_refresh_cookie(response, refresh_token: str) -> None:
    set_session_hint_cookie(response)
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        max_age=get_refresh_max_age_seconds(),
        expires=None,
        path=_cookie_path(),
        domain=_cookie_domain(),
        secure=_cookie_secure(),
        httponly=True,
        samesite=_cookie_samesite(),
    )


def clear_refresh_cookie(response) -> None:
    clear_session_hint_cookie(response)
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value="",
        max_age=0,
        expires=0,
        path=_cookie_path(),
        domain=_cookie_domain(),
        secure=_cookie_secure(),
        httponly=True,
        samesite=_cookie_samesite(),
    )


def get_refresh_from_request(request) -> str | None:
    return request.COOKIES.get(REFRESH_COOKIE_NAME)
