from __future__ import annotations

import traceback as _traceback

from apps.monitoring.models.system_error import SystemError


def _client_ip(request) -> str | None:
    try:
        xff = (request.META.get("HTTP_X_FORWARDED_FOR") or "").split(",")[0].strip()
        if xff:
            return xff
        return (request.META.get("REMOTE_ADDR") or "").strip() or None
    except Exception:
        return None


def _resolver_info(request) -> tuple[str, str, str]:
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

        view_action = str(getattr(rm, "url_name", None) or getattr(rm, "view_name", None) or "")
        kwargs = getattr(rm, "kwargs", {}) or {}
        object_id = str(kwargs.get("pk") or kwargs.get("id") or kwargs.get("custom_id") or "")
    except Exception:
        pass

    return view_basename, view_action, object_id


class ErrorCaptureMiddleware:
    """
    Captura exceções não tratadas e persiste em BD (Monitoramento/ErroSistema).

    Importante: nunca deve impedir a propagação do error original.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            return self.get_response(request)
        except Exception as exc:
            try:
                tenant = getattr(request, "tenant", None)
                if not tenant:
                    raise

                # Evita armazenar ruído de assets; mantém API/admin/pdf.
                if not (
                    request.path.startswith("/api/")
                    or request.path.startswith("/admin/")
                    or request.path.startswith("/pdf/")
                ):
                    raise

                user = getattr(request, "user", None)
                user = user if getattr(user, "is_authenticated", False) else None

                status_code = getattr(request, "status_code", None) or 500
                duration_ms = getattr(request, "duration_ms", None)
                duration_ms_int = None
                if duration_ms is not None:
                    try:
                        duration_ms_int = round(float(duration_ms))
                    except Exception:
                        duration_ms_int = None

                view_basename, view_action, object_id = _resolver_info(request)

                SystemError.objects.create(
                    tenant=tenant,
                    user=user,
                    method=request.method,
                    path=(request.path or "")[:255],
                    full_path=(request.get_full_path() or ""),
                    status_code=int(status_code) if status_code else 500,
                    duration_ms=duration_ms_int,
                    ip=_client_ip(request),
                    user_agent=(request.META.get("HTTP_USER_AGENT") or "")[:255],
                    view_basename=(view_basename or "")[:120],
                    view_action=(view_action or "")[:120],
                    object_id=(object_id or "")[:80],
                    exception_class=exc.__class__.__name__,
                    message=(str(exc) or "")[:500],
                    traceback=_traceback.format_exc(),
                    metadata={
                        "referer": (request.META.get("HTTP_REFERER") or "")[:500],
                    },
                )
            except Exception:
                # Se falhar o record do error, segue propagando o error original.
                pass
            raise
