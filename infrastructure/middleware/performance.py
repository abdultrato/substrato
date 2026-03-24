import logging
import time

from observability.metricas import log_slow_request

logger = logging.getLogger("api")

SLOW_REQUEST_THRESHOLD_MS = 1000


class APILoggingMiddleware:
    """
    Logging estruturado + detecção de lentidão.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):

        start = time.perf_counter()
        status_code = 500

        try:
            response = self.get_response(request)
            status_code = response.status_code
            return response

        except Exception:
            logger.exception(
                "API_EXCEPTION",
                extra=self._build_extra(request, status_code, 0),
            )
            raise

        finally:
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            # Consumido por TenantAuditMiddleware para persistência em BD.
            try:
                request.duracao_ms = duration_ms
                request.status_code = status_code
            except Exception:
                pass

            if duration_ms >= SLOW_REQUEST_THRESHOLD_MS:
                log_slow_request(
                    path=request.path,
                    duration=duration_ms / 1000,
                    tenant_id=self._get_tenant_id(request),
                )

            logger.info(
                "API_REQUEST",
                extra=self._build_extra(
                    request,
                    status_code,
                    duration_ms,
                ),
            )

    def _get_tenant_id(self, request):
        inquilino = getattr(request, "inquilino", None)
        return getattr(inquilino, "id", None)

    def _build_extra(self, request, status_code, duration_ms):
        inquilino = getattr(request, "inquilino", None)
        user = getattr(request, "user", None)

        return {
            "metodo": request.method,
            "path": request.get_full_path(),
            "status_code": status_code,
            "duracao_ms": duration_ms,
            "tenant_id": getattr(inquilino, "id", None),
            "user_id": getattr(user, "id", None),
        }
