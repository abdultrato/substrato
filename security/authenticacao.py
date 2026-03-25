from contextlib import suppress

from django.conf import settings
from django.core.cache import cache
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication

SESSION_CACHE_PREFIX = "auth:sid:"


def _session_cache_key(user_id: int) -> str:
    return f"{SESSION_CACHE_PREFIX}{user_id}"


def _session_timeout_seconds() -> int:
    minutes = getattr(settings, "SESSION_IDLE_TIMEOUT_MINUTES", 30) or 30
    try:
        minutes = int(minutes)
    except Exception:
        minutes = 30
    return max(5, minutes) * 60


class JWTAuth(JWTAuthentication):
    def authenticate(self, request):
        # 1) Tenta header Authorization padrão.
        result = super().authenticate(request)

        # 2) Se não houver header, tenta cookie HttpOnly 'access_token'.
        if result is None:
            raw_token = request.COOKIES.get("access_token")
            if raw_token:
                validated_token = self.get_validated_token(raw_token)
                user = self.get_user(validated_token)
                result = (user, validated_token)

        if result:
            user, _token = result
            request.user_autenticado = user

            session_id = _token.get("sid") if hasattr(_token, "get") else None
            if not session_id:
                raise AuthenticationFailed("Sessão inválida.")

            key = _session_cache_key(user.id)
            stored_session_id = cache.get(key)

            if stored_session_id is None:
                # Cache ausente ou vazio: rehidrata e segue para não bloquear login.
                with suppress(Exception):
                    cache.set(key, session_id, timeout=_session_timeout_seconds())
            elif stored_session_id != session_id:
                raise AuthenticationFailed("Sessão expirada ou revogada.")

            # Renovar a janela deslizante de inatividade (idle timeout)
            try:
                cache.touch(key, timeout=_session_timeout_seconds())
            except Exception:
                cache.set(key, session_id, timeout=_session_timeout_seconds())

        return result
