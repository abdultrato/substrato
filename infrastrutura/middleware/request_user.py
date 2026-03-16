# LOCAL: infrastrutura/middleware/request_user.py

from django.utils.functional import SimpleLazyObject

from infrastrutura.contexto.request_user import clear_current_user, set_current_user


def _get_user(request):
    return getattr(request, "user", None)


class RequestUserMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user = SimpleLazyObject(lambda: _get_user(request))

        try:
            set_current_user(user)
            return self.get_response(request)
        finally:
            clear_current_user()
