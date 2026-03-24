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
    objeto_id = ""
    try:
        rm = getattr(request, "resolver_match", None)
        if not rm:
            return view_basename, view_action, objeto_id

        func = getattr(rm, "func", None)
        initkwargs = getattr(func, "initkwargs", {}) or {}
        view_basename = str(initkwargs.get("basename") or "")

        view_action = str(getattr(rm, "url_name", None) or getattr(rm, "view_name", None) or "")
        kwargs = getattr(rm, "kwargs", {}) or {}
        objeto_id = str(kwargs.get("pk") or kwargs.get("id") or kwargs.get("id_custom") or "")
    except Exception:
        pass

    return view_basename, view_action, objeto_id


class ErrorCaptureMiddleware:
    """
    Captura exceções não tratadas e persiste em BD (Monitoramento/ErroSistema).

    Importante: nunca deve impedir a propagação do erro original.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            return self.get_response(request)
        except Exception as exc:
            try:
                inquilino = getattr(request, "inquilino", None)
                if not inquilino:
                    raise

                # Evita armazenar ruído de assets; mantém API/admin/pdf.
                if not (
                    request.path.startswith("/api/")
                    or request.path.startswith("/admin/")
                    or request.path.startswith("/pdf/")
                ):
                    raise

                user = getattr(request, "user", None)
                usuario = user if getattr(user, "is_authenticated", False) else None

                status_code = getattr(request, "status_code", None) or 500
                duracao_ms = getattr(request, "duracao_ms", None)
                duracao_ms_int = None
                if duracao_ms is not None:
                    try:
                        duracao_ms_int = round(float(duracao_ms))
                    except Exception:
                        duracao_ms_int = None

                view_basename, view_action, objeto_id = _resolver_info(request)

                SystemError.objects.create(
                    inquilino=inquilino,
                    usuario=usuario,
                    metodo=request.method,
                    caminho=(request.path or "")[:255],
                    path_completo=(request.get_full_path() or ""),
                    status_code=int(status_code) if status_code else 500,
                    duracao_ms=duracao_ms_int,
                    ip=_client_ip(request),
                    user_agent=(request.META.get("HTTP_USER_AGENT") or "")[:255],
                    view_basename=(view_basename or "")[:120],
                    view_action=(view_action or "")[:120],
                    objeto_id=(objeto_id or "")[:80],
                    exception_class=exc.__class__.__name__,
                    mensagem=(str(exc) or "")[:500],
                    traceback=_traceback.format_exc(),
                    metadata={
                        "referer": (request.META.get("HTTP_REFERER") or "")[:500],
                    },
                )
            except Exception:
                # Se falhar o registro do erro, segue propagando o erro original.
                pass
            raise
