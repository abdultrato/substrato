"""Middleware que registra eventos de auditoria multi-tenant."""

from concurrent.futures import ThreadPoolExecutor
import logging

from django.conf import settings
from django.db import close_old_connections

from apps.audit_activities.models.user_activity import UserActivity
from observability.audit import register_event

logger = logging.getLogger("tenant_audit")

_executor: ThreadPoolExecutor | None = None


def _get_executor() -> ThreadPoolExecutor:
    global _executor
    if _executor is None:
        workers = max(1, int(getattr(settings, "AUDIT_ACTIVITY_WORKERS", 1) or 1))
        _executor = ThreadPoolExecutor(
            max_workers=workers,
            thread_name_prefix="substrato-audit",
        )
    return _executor


def _create_activity(payload: dict) -> None:
    close_old_connections()
    try:
        UserActivity.objects.create(**payload)
    except Exception:
        logger.debug("Falha ao gravar atividade de auditoria.", exc_info=True)
    finally:
        close_old_connections()


def _persist_activity(payload: dict) -> None:
    if getattr(settings, "AUDIT_ACTIVITY_ASYNC", True):
        _get_executor().submit(_create_activity, payload)
        return
    _create_activity(payload)


def _client_ip(request) -> str | None:
    try:
        xff = (request.META.get("HTTP_X_FORWARDED_FOR") or "").split(",")[0].strip()
        if xff:
            return xff
        return (request.META.get("REMOTE_ADDR") or "").strip() or None
    except Exception:
        return None


def _resolver_info(request) -> tuple[str, str, str]:
    """
    Best-effort view info. For DRF ViewSets, resolver_match.func.initkwargs may contain basename.
    """
    view_basename = ""
    view_action = ""
    object_id = ""
    try:
        rm = getattr(request, "resolver_match", None)
        if not rm:
            return view_basename, view_action, object_id

        func = getattr(rm, "func", None)
        initkwargs = getattr(func, "initkwargs", {}) or {}
        view_basename = str(initkwargs.get("basename") or "")

        # url_name is usually stable and helps debugging; can be empty for some resolvers.
        view_action = str(getattr(rm, "url_name", None) or getattr(rm, "view_name", None) or "")

        kwargs = getattr(rm, "kwargs", {}) or {}
        object_id = str(kwargs.get("pk") or kwargs.get("id") or kwargs.get("custom_id") or "")
    except Exception:
        pass

    return view_basename, view_action, object_id


class TenantAuditMiddleware:
    """
    Auditoria multi-tenant.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Em ambiente de desenvolvimento, não registrar auditoria para reduzir overhead.
        if settings.DEBUG:
            return response

        tenant = getattr(request, "tenant", None)

        # Mantém log estruturado em file (observabilidade)
        register_event(
            user=getattr(request, "user", None),
            tenant_id=getattr(tenant, "id", None),
            path=request.path,
            method=request.method,
            status_code=response.status_code,
        )

        # Persistência em BD (para UI de auditoria/uso de sistema).
        try:
            if not tenant:
                return response

            # Evita poluir auditoria com assets; grava rotas relevantes.
            if not (
                request.path.startswith("/api/")
                or request.path.startswith("/admin/")
                or request.path.startswith("/pdf/")
            ):
                return response

            user = getattr(request, "user", None)
            user_id = getattr(user, "pk", None) if getattr(user, "is_authenticated", False) else None

            status_code = getattr(request, "status_code", None) or getattr(response, "status_code", None)
            duration_ms = getattr(request, "duration_ms", None)
            duration_ms_int = None
            if duration_ms is not None:
                try:
                    duration_ms_int = round(float(duration_ms))
                except Exception:
                    duration_ms_int = None

            view_basename, view_action, object_id = _resolver_info(request)

            _persist_activity(
                {
                    "tenant_id": getattr(tenant, "id", None),
                    "user_id": user_id,
                    "method": request.method,
                    "path": (request.path or "")[:255],
                    "full_path": (request.get_full_path() or ""),
                    "status_code": status_code,
                    "duration_ms": duration_ms_int,
                    "ip": _client_ip(request),
                    "user_agent": (request.META.get("HTTP_USER_AGENT") or "")[:255],
                    "view_basename": (view_basename or "")[:120],
                    "view_action": (view_action or "")[:120],
                    "object_id": (object_id or "")[:80],
                    "message": "",
                    "metadata": {
                        "referer": (request.META.get("HTTP_REFERER") or "")[:500],
                    },
                }
            )
        except Exception:
            # Não pode quebrar a response por error de audit.
            pass

        return response
