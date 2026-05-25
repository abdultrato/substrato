"""Middleware multi-tenant que configura contexto e banco para cada request."""

import os
import time

from django.conf import settings
from django.core.cache import cache
from django.db import OperationalError, connection
from django.http import JsonResponse

from apps.tenants.models.tenant import Tenant
from infrastructure.context.tenant import reset_tenant, set_tenant

# Backwards-compatibility handle used by test instrumentation.
_CONNECTION_SENTINEL = connection


class TenantMiddleware:
    """
    Resolve the current tenant from the request host or integration credentials.
    """

    CACHE_TIMEOUT = 60 * 10
    LOCAL_CACHE_TIMEOUT = 20
    FAST_REDIRECT_PATHS = {
        "/",
        "/dashboard",
        "/dashboard/",
    }
    TENANT_OPTIONAL_PATHS = {
        "/admin",
        "/admin/",
        "/admin/login",
        "/admin/login/",
    }
    TENANT_LOOKUP_FIELDS = (
        "id",
        "name",
        "identifier",
        "domain",
        "active",
        "commercial_status",
        "trial_until",
        "blocked_at",
    )

    def __init__(self, get_response):
        self.get_response = get_response
        self._local_tenant_cache = {}

    def __call__(self, request):
        try:
            return self._handle(request)
        except OperationalError:
            return JsonResponse({"error": "Base de dados indisponível."}, status=503)

    def _handle(self, request):
        if (
            request.path.startswith("/health/")
            or request.path.startswith("/metrics")
            or request.path.startswith(getattr(settings, "MEDIA_URL", "/media/"))
            or request.path in self.FAST_REDIRECT_PATHS
        ):
            token = set_tenant(None)
            request.tenant = None
            try:
                return self.get_response(request)
            finally:
                reset_tenant(token)

        if settings.DEBUG:
            tenant = self._resolve_debug_tenant(request)
            if isinstance(tenant, JsonResponse):
                return tenant

            token = set_tenant(tenant)
            request.tenant = tenant
            try:
                return self.get_response(request)
            finally:
                reset_tenant(token)

        host = request.get_host().split(":")[0].lower().strip()
        if not host:
            return JsonResponse({"error": "Host inválido."}, status=400)

        tenant = self._resolve_tenant(host)

        if not tenant and not settings.DEBUG and os.getenv("TENANT_FALLBACK_DEFAULT", "").lower() in {"1", "true", "yes"}:
            tenant = self._resolve_first_active_tenant()
            if tenant:
                self._cache_tenant_for_host(host, tenant)

        if not tenant and request.path.startswith("/api/v1/equipment_integrations/equipment/"):
            try:
                from apps.equipment_integrations.models.credential import IntegrationCredential

                raw_key = (
                    request.headers.get("X-Integration-Key") or request.META.get("HTTP_X_INTEGRATION_KEY") or ""
                ).strip()
                credential = IntegrationCredential.validate_key(raw_key)
                if credential and getattr(credential, "equipment_id", None):
                    tenant = credential.equipment.tenant
            except Exception:
                tenant = None

        token = set_tenant(tenant)
        request.tenant = tenant

        try:
            if not tenant:
                if (
                    request.path.startswith("/api/v1/equipment_integrations/equipment/")
                    or request.path in self.TENANT_OPTIONAL_PATHS
                ):
                    return self.get_response(request)
                return JsonResponse({"error": "Tenant não encontrado."}, status=404)

            if not tenant.active:
                return JsonResponse({"error": "Tenant inativo."}, status=403)

            if tenant.is_blocked():
                return JsonResponse({"error": "Tenant bloqueado ou inadimplente."}, status=403)

            return self.get_response(request)
        finally:
            reset_tenant(token)

    def _resolve_debug_tenant(self, request):
        host = ""
        try:
            host = request.get_host().split(":")[0].lower().strip()
        except Exception:
            host = ""

        try:
            tenant = self._resolve_tenant(host) if host else None
            if not tenant:
                tenant = self._resolve_first_active_tenant()

            if not tenant:
                try:
                    tenant = Tenant.objects.create(
                        name="Tenant Local",
                        identifier="local",
                        domain=host or "localhost",
                        active=True,
                        commercial_status=Tenant.CommercialStatus.TRIAL,
                    )
                    if host:
                        self._cache_tenant_for_host(host, tenant)
                except Exception:
                    tenant = (
                        Tenant.objects.only(*self.TENANT_LOOKUP_FIELDS)
                        .filter(identifier="local")
                        .order_by("id")
                        .first()
                    )
        except OperationalError:
            return JsonResponse({"error": "Base de dados indisponível."}, status=503)

        return tenant

    def _resolve_tenant(self, host):
        if not host:
            return None

        local_hit, local_tenant = self._local_cache_get(host)
        if local_hit:
            return local_tenant

        cache_key = f"tenant_domain:{host}"
        tenant_id = self._cache_get(cache_key)

        if tenant_id:
            tenant = self._fetch_tenant_by_id(tenant_id)
            if tenant:
                self._local_cache_set(host, tenant)
                return tenant
            self._cache_delete(cache_key)

        tenant = (
            Tenant.objects.only(*self.TENANT_LOOKUP_FIELDS)
            .filter(domain=host, active=True)
            .first()
        )
        if tenant:
            self._cache_set(cache_key, tenant.id, self.CACHE_TIMEOUT)
            self._local_cache_set(host, tenant)
        return tenant

    def _resolve_first_active_tenant(self):
        cache_key = "tenant:first_active"
        tenant_id = self._cache_get(cache_key)
        if tenant_id:
            tenant = self._fetch_tenant_by_id(tenant_id)
            if tenant:
                return tenant
            self._cache_delete(cache_key)

        tenant = (
            Tenant.objects.only(*self.TENANT_LOOKUP_FIELDS)
            .filter(active=True)
            .order_by("id")
            .first()
        )
        if tenant:
            self._cache_set(cache_key, tenant.id, self.CACHE_TIMEOUT)
        return tenant

    def _fetch_tenant_by_id(self, tenant_id):
        return (
            Tenant.objects.only(*self.TENANT_LOOKUP_FIELDS)
            .filter(id=tenant_id, active=True)
            .first()
        )

    def _cache_tenant_for_host(self, host, tenant):
        if not host or not tenant:
            return
        self._cache_set(f"tenant_domain:{host}", tenant.id, self.CACHE_TIMEOUT)
        self._local_cache_set(host, tenant)

    def _cache_get(self, key, default=None):
        try:
            return cache.get(key, default)
        except Exception:
            return default

    def _cache_set(self, key, value, timeout):
        try:
            cache.set(key, value, timeout)
        except Exception:
            return None
        return value

    def _cache_delete(self, key):
        try:
            cache.delete(key)
        except Exception:
            return None
        return key

    def _local_cache_get(self, key):
        entry = self._local_tenant_cache.get(key)
        if not entry:
            return False, None

        expires_at, tenant = entry
        if expires_at <= time.monotonic():
            self._local_tenant_cache.pop(key, None)
            return False, None

        return True, tenant

    def _local_cache_set(self, key, tenant):
        if len(self._local_tenant_cache) >= 256:
            self._local_tenant_cache.clear()
        self._local_tenant_cache[key] = (
            time.monotonic() + self.LOCAL_CACHE_TIMEOUT,
            tenant,
        )


InquilinoMiddleware = TenantMiddleware
