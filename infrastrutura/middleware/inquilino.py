from aplicativos.inquilinos.modelos.inquilino import Inquilino
from infrastrutura.contexto.inquilino import set_inquilino


class InquilinoMiddleware:

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        host = request.get_host().split(":")[0]

        try:
            inquilino = Inquilino.objects.get(dominio=host, ativo=True)
        except Inquilino.DoesNotExist:
            inquilino = None

        request.inquilino = inquilino
        set_inquilino(inquilino)

        return self.get_response(request)
