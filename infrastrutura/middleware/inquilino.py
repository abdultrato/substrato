from django.http import JsonResponse
from django.core.cache import cache
from django.utils.deprecation import MiddlewareMixin

from aplicativos.inquilinos.modelos.inquilino import Inquilino
from infrastrutura.contexto.inquilino import (
    set_inquilino,
    clear_inquilino,
)


class InquilinoMiddleware:
    """
    Resolve o tenant por domínio.

    ✔ Cache Redis
    ✔ Bloqueio comercial
    ✔ ContextVar-safe
    ✔ Sem vazamento de contexto
    ✔ SaaS-ready
    """

    CACHE_TIMEOUT = 60 * 10  # 10 minutos

    def __init__(self, get_response):
        self.get_response = get_response

    # =====================================================
    # RESOLUÇÃO
    # =====================================================

    def __call__(self, request):
        host = request.get_host().split(":")[0]

        inquilino = self._resolver_inquilino(host)

        request.inquilino = inquilino
        set_inquilino(inquilino)

        try:
            # Se não existe tenant → erro claro
            if not inquilino:
                return JsonResponse(
                    {"erro": "Tenant não encontrado."},
                    status=404,
                )

            # Bloqueio comercial
            if inquilino.esta_bloqueado():
                return JsonResponse(
                    {"erro": "Tenant bloqueado ou inadimplente."},
                    status=403,
                )

            return self.get_response(request)

        finally:
            clear_inquilino()

    # =====================================================
    # CACHE
    # =====================================================

    def _resolver_inquilino(self, host):
        cache_key = f"tenant_domain:{host}"

        inquilino_id = cache.get(cache_key)

        if inquilino_id:
            try:
                return Inquilino.objects.select_related().get(id=inquilino_id)
            except Inquilino.DoesNotExist:
                cache.delete(cache_key)

        try:
            inquilino = Inquilino.objects.get(
                dominio=host,
                ativo=True,
            )

            cache.set(cache_key, inquilino.id, self.CACHE_TIMEOUT)

            return inquilino

        except Inquilino.DoesNotExist:
            return None
