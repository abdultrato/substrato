"""Middleware que expõe o usuário atual via ContextVar durante a requisição."""

# LOCAL: infrastrutura/middleware/request_user.py

from contextlib import suppress

from infrastructure.context.request_user import clear_current_user, get_current_user as _get_current_user, set_current_user


def get_current_user():
    """Compatibilidade para imports antigos deste módulo."""
    return _get_current_user()


def _get_authenticated_user(request):
    """Resolve o usuário autenticado sem guardar SimpleLazyObject no ContextVar."""
    user = getattr(request, "user", None)
    if user is None:
        return None

    with suppress(Exception):
        if getattr(user, "is_authenticated", False):
            return getattr(user, "_wrapped", user)

    return None


class RequestUserMiddleware:
    """Registra o usuário da requisição em um ContextVar acessível por serviços."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            set_current_user(_get_authenticated_user(request))
            return self.get_response(request)
        finally:
            clear_current_user()
