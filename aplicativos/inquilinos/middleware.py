from .modelos import Inquilino

class InquilinoMiddleware:

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        host = request.get_host().split(":")[0]

        try:
            request.inquilino = Inquilino.objects.get(dominio=host)
        except Inquilino.DoesNotExist:
            request.inquilino = None

        return self.get_response(request)
