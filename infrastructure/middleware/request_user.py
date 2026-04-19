"""Middleware que expõe o usuário atual via ContextVar durante a requisição."""

# LOCAL: infrastrutura/middleware/request_user.py

from django.utils.functional import SimpleLazyObject

from infrastructure.context.request_user import clear_current_user, set_current_user


def _get_user(request):
    """Obtém o usuário do objeto request, se presente."""
    return getattr(request, "user", None)


class RequestUserMiddleware:
    """Registra o usuário da requisição em um ContextVar acessível por serviços."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user = SimpleLazyObject(lambda: _get_user(request))

        try:
            set_current_user(user)
            return self.get_response(request)
        finally:
            clear_current_user()
