"""Middleware que registra atividades de usuário para auditoria."""

from contextlib import suppress
import time
from typing import Any

from django.conf import settings
from django.utils.deprecation import MiddlewareMixin

from apps.audit_activities.models.user_activity import UserActivity


class UserActivityMiddleware(MiddlewareMixin):
    """
    Captura requisições (admin/API/site) e grava em audit_activities.UserActivity.
    """

    IGNORE_PREFIXES = (
        "/health",
        "/metrics",
        "/static",
        "/media",
        "/_next",
        "/favicon.ico",
    )

    def process_request(self, request):
        request._activity_start = time.monotonic()

    def process_response(self, request, response):
        with suppress(Exception):
            self._save_activity(request, getattr(response, "status_code", None) or 0)
        return response

    def process_exception(self, request, exception):
        with suppress(Exception):
            self._save_activity(request, 500)
        return

    # ----------------------------

    def _save_activity(self, request, status_code: int):
        if settings.DEBUG and not getattr(settings, "USER_ACTIVITY_IN_DEBUG", False):
            return

        path = getattr(request, "path", "") or ""
        if any(path.startswith(prefix) for prefix in self.IGNORE_PREFIXES):
            return

        duration_ms = None
        start = getattr(request, "_activity_start", None)
        if start is not None:
            duration_ms = int((time.monotonic() - start) * 1000)

        user = getattr(request, "user", None)
        user_obj = user if getattr(user, "is_authenticated", False) else None

        resolver = getattr(request, "resolver_match", None)
        view_basename = ""
        view_action = ""
        object_id = ""
        if resolver:
            view_basename = (resolver.view_name or "")[:120]
            view_action = (resolver.url_name or "")[:120]
            for key in ("pk", "id"):
                if key in resolver.kwargs:
                    object_id = str(resolver.kwargs[key])[:80]
                    break

        metadata: dict[str, Any] = {}
        with suppress(Exception):
            metadata["query_params"] = request.GET.dict()

        tenant = getattr(request, "tenant", None)
        tenant_id = getattr(tenant, "id", None) or getattr(tenant, "pk", None)
        if tenant_id is None:
            return

        UserActivity.objects.create(
            tenant_id=tenant_id,
            user=user_obj,
            method=(request.method or "")[:10],
            path=path[:255],
            full_path=(getattr(request, "get_full_path", lambda: "")() or "")[:500],
            status_code=status_code,
            duration_ms=duration_ms,
            ip=(request.META.get("REMOTE_ADDR") or "")[:45],
            user_agent=(request.META.get("HTTP_USER_AGENT") or "")[:255],
            view_basename=view_basename,
            view_action=view_action,
            object_id=object_id,
            message="",
            metadata=metadata,
        )
