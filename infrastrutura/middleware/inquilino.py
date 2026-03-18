import os

from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse
from django.db import OperationalError, connection

from aplicativos.inquilinos.modelos.inquilino import Inquilino
from infrastrutura.contexto.inquilino import (
    reset_inquilino,
    set_inquilino,
)


class InquilinoMiddleware:
    CACHE_TIMEOUT = 60 * 10

    def __init__(self, get_response):
        self.get_response = get_response

    # =====================================================

    def __call__(self, request):
        # Proteção global: se ocorrer erro de DB não capturado mais abaixo, retorna 503.
        try:
            return self._handle(request)
        except OperationalError:
            return JsonResponse({"erro": "Base de dados indisponível."}, status=503)

    # =====================================================

    def _handle(self, request):
        # Endpoints de health/metrics não precisam de resolução de tenant nem de DB.
        if request.path.startswith("/health/") or request.path.startswith("/metrics"):
            token = set_inquilino(None)
            request.inquilino = None
            try:
                return self.get_response(request)
            finally:
                reset_inquilino(token)

        # Verifica conexão DB e tenta reestabelecer se necessário (antes de qualquer query).
        try:
            connection.close_if_unusable_or_obsolete()
            connection.ensure_connection()
        except OperationalError:
            return JsonResponse({"erro": "Base de dados indisponível."}, status=503)

        # ---------------------------------
        # DESENVOLVIMENTO (DEBUG)
        # ---------------------------------
        # Em DEBUG, definimos um tenant na thread-local para permitir
        # criação/validação de modelos que exigem `inquilino` via InquilinoMixin.
        # Caso não exista nenhum tenant no banco, cria um tenant local (modo DEBUG).
        if settings.DEBUG:
            host = ""
            try:
                host = request.get_host().split(":")[0].lower().strip()
            except Exception:
                host = ""

            inquilino = None

            try:
                if host:
                    inquilino = Inquilino.objects.filter(dominio=host).order_by("id").first()

                if not inquilino:
                    inquilino = Inquilino.objects.filter(ativo=True).order_by("id").first()

                if not inquilino:
                    # Tenant mínimo para desenvolvimento local.
                    try:
                        inquilino = Inquilino.objects.create(
                            nome="Tenant Local",
                            identificador="local",
                            dominio=host or "localhost",
                            ativo=True,
                            status_comercial=Inquilino.StatusComercial.TRIAL,
                        )
                    except Exception:
                        # Fallback para corrida/conflito de unique.
                        inquilino = Inquilino.objects.filter(identificador="local").order_by("id").first()
            except OperationalError:
                return JsonResponse({"erro": "Base de dados indisponível."}, status=503)

            token = set_inquilino(inquilino)
            request.inquilino = inquilino

            try:
                return self.get_response(request)
            finally:
                reset_inquilino(token)

        host = request.get_host().split(":")[0].lower().strip()

        if not host:
            return JsonResponse({"erro": "Host inválido."}, status=400)

        # Verifica conexão DB e tenta reestabelecer se necessário.
        try:
            connection.close_if_unusable_or_obsolete()
            connection.ensure_connection()
        except OperationalError:
            return JsonResponse({"erro": "Base de dados indisponível."}, status=503)

        inquilino = self._resolver_inquilino(host)

        # Fallback opcional em ambientes sem DNS adequado:
        # define TENANT_FALLBACK_DEFAULT=true para usar o primeiro tenant ativo
        # quando o host não corresponde a nenhum domínio configurado.
        if not inquilino and settings.DEBUG is False and os.getenv("TENANT_FALLBACK_DEFAULT", "").lower() in {
            "1",
            "true",
            "yes",
        }:
            inquilino = Inquilino.objects.filter(ativo=True).order_by("id").first()
            if inquilino:
                cache.set(f"tenant_domain:{host}", inquilino.id, self.CACHE_TIMEOUT)

        # Integrações de equipamentos (machine-to-machine) podem autenticar tenant via
        # API key, sem depender do domínio do Host.
        if not inquilino and request.path.startswith("/api/v1/integracoes/equipamentos/"):
            try:
                from aplicativos.integracoes_equipamentos.modelos.credencial import (
                    IntegracaoCredencial,
                )

                raw_key = (
                    request.headers.get("X-Integration-Key") or request.META.get("HTTP_X_INTEGRATION_KEY") or ""
                ).strip()
                cred = IntegracaoCredencial.validar_chave(raw_key)
                if cred and getattr(cred, "equipamento_id", None):
                    inquilino = cred.equipamento.inquilino
            except Exception:
                # Se falhar, segue sem tenant; a view retornará 401.
                inquilino = None

        token = set_inquilino(inquilino)
        request.inquilino = inquilino

        try:
            if not inquilino:
                # Para integrações de equipamentos, deixamos a view tratar autenticação
                # (retornando 401/403 conforme credencial).
                if request.path.startswith("/api/v1/integracoes/equipamentos/"):
                    return self.get_response(request)
                return JsonResponse({"erro": "Tenant não encontrado."}, status=404)

            if not inquilino.ativo:
                return JsonResponse({"erro": "Tenant inativo."}, status=403)

            if inquilino.esta_bloqueado():
                return JsonResponse(
                    {"erro": "Tenant bloqueado ou inadimplente."},
                    status=403,
                )

            return self.get_response(request)

        finally:
            reset_inquilino(token)

    # =====================================================

    def _resolver_inquilino(self, host):
        cache_key = f"tenant_domain:{host}"

        tenant_id = cache.get(cache_key)

        if tenant_id:
            inquilino = Inquilino.objects.only("id", "ativo").filter(id=tenant_id, ativo=True).first()

            if inquilino:
                return inquilino

            cache.delete(cache_key)

        inquilino = Inquilino.objects.only("id", "ativo").filter(dominio=host, ativo=True).first()

        if inquilino:
            cache.set(cache_key, inquilino.id, self.CACHE_TIMEOUT)

        return inquilino
