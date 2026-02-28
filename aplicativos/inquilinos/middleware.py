from .modelos import Inquilino
import logging
logger = logging.getLogger(__name__)

class InquilinoMiddleware:

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        host = request.get_host().split(":")[0]

        try:
            request.inquilino = Inquilino.objects.get(dominio=host)
        except Inquilino.DoesNotExist:
            ogger.warning("Inquilino não encontrado para domínio: %s", host)
            request.inquilino = None

        return self.get_response(request)
