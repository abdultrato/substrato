from apps.audit_activities.models.user_activity import UserActivity
from observability.audit import registrar_evento


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
    objeto_id = ""
    try:
        rm = getattr(request, "resolver_match", None)
        if not rm:
            return view_basename, view_action, objeto_id

        func = getattr(rm, "func", None)
        initkwargs = getattr(func, "initkwargs", {}) or {}
        view_basename = str(initkwargs.get("basename") or "")

        # url_name is usually stable and helps debugging; can be empty for some resolvers.
        view_action = str(getattr(rm, "url_name", None) or getattr(rm, "view_name", None) or "")

        kwargs = getattr(rm, "kwargs", {}) or {}
        objeto_id = str(kwargs.get("pk") or kwargs.get("id") or kwargs.get("id_custom") or "")
    except Exception:
        pass

    return view_basename, view_action, objeto_id


class TenantAuditMiddleware:
    """
    Auditoria multi-tenant.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        inquilino = getattr(request, "inquilino", None)

        # Mantém log estruturado em arquivo (observabilidade)
        registrar_evento(
            usuario=getattr(request, "user", None),
            tenant_id=getattr(inquilino, "id", None),
            caminho=request.path,
            metodo=request.method,
            status_code=response.status_code,
        )

        # Persistência em BD (para UI de auditoria/uso de sistema).
        try:
            if not inquilino:
                return response

            # Evita poluir auditoria com assets; grava rotas relevantes.
            if not (
                request.path.startswith("/api/")
                or request.path.startswith("/admin/")
                or request.path.startswith("/pdf/")
            ):
                return response

            user = getattr(request, "user", None)
            usuario = user if getattr(user, "is_authenticated", False) else None

            status_code = getattr(request, "status_code", None) or getattr(response, "status_code", None)
            duracao_ms = getattr(request, "duracao_ms", None)
            duracao_ms_int = None
            if duracao_ms is not None:
                try:
                    duracao_ms_int = round(float(duracao_ms))
                except Exception:
                    duracao_ms_int = None

            view_basename, view_action, objeto_id = _resolver_info(request)

            UserActivity.objects.create(
                inquilino=inquilino,
                usuario=usuario,
                metodo=request.method,
                caminho=(request.path or "")[:255],
                path_completo=(request.get_full_path() or ""),
                status_code=status_code,
                duracao_ms=duracao_ms_int,
                ip=_client_ip(request),
                user_agent=(request.META.get("HTTP_USER_AGENT") or "")[:255],
                view_basename=(view_basename or "")[:120],
                view_action=(view_action or "")[:120],
                objeto_id=(objeto_id or "")[:80],
                mensagem="",
                metadata={
                    "referer": (request.META.get("HTTP_REFERER") or "")[:500],
                },
            )
        except Exception:
            # Não pode quebrar a resposta por erro de audit.
            pass

        return response
