from threading import local

_user = local()


def get_current_user():
    return getattr(_user, "value", None)


class RequestUserMiddleware:
    """
    Armazena o usuário atual em thread local
    para auditoria automática.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _user.value = getattr(request, "user", None)
        response = self.get_response(request)
        return response
