"""Middleware multi-tenant que configura contexto e banco para cada request."""

import os

from django.conf import settings
from django.core.cache import cache
from django.db import OperationalError, connection
from django.http import JsonResponse

from apps.tenants.models.tenant import Tenant
from infrastructure.context.tenant import reset_tenant, set_tenant


class TenantMiddleware:
    """
    Resolve the current tenant from the request host or integration credentials.
    """

    CACHE_TIMEOUT = 60 * 10

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            return self._handle(request)
        except OperationalError:
            return JsonResponse({"error": "Base de dados indisponível."}, status=503)

    def _handle(self, request):
        if request.path.startswith("/health/") or request.path.startswith("/metrics"):
            token = set_tenant(None)
            request.tenant = None
            request.tenant = None
            try:
                return self.get_response(request)
            finally:
                reset_tenant(token)

        try:
            connection.close_if_unusable_or_obsolete()
            connection.ensure_connection()
        except OperationalError:
            return JsonResponse({"error": "Base de dados indisponível."}, status=503)

        if settings.DEBUG:
            tenant = self._resolve_debug_tenant(request)
            if isinstance(tenant, JsonResponse):
                return tenant

            token = set_tenant(tenant)
            request.tenant = tenant
            request.tenant = tenant
            try:
                return self.get_response(request)
            finally:
                reset_tenant(token)

        host = request.get_host().split(":")[0].lower().strip()
        if not host:
            return JsonResponse({"error": "Host inválido."}, status=400)

        try:
            connection.close_if_unusable_or_obsolete()
            connection.ensure_connection()
        except OperationalError:
            return JsonResponse({"error": "Base de dados indisponível."}, status=503)

        tenant = self._resolve_tenant(host)

        if not tenant and not settings.DEBUG and os.getenv("TENANT_FALLBACK_DEFAULT", "").lower() in {"1", "true", "yes"}:
            tenant = Tenant.objects.filter(active=True).order_by("id").first()
            if tenant:
                self._cache_set(f"tenant_domain:{host}", tenant.id, self.CACHE_TIMEOUT)

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
        request.tenant = tenant

        try:
            if not tenant:
                if request.path.startswith("/api/v1/equipment_integrations/equipment/"):
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

        tenant = None

        try:
            if host:
                tenant = Tenant.objects.filter(domain=host).order_by("id").first()

            if not tenant:
                tenant = Tenant.objects.filter(active=True).order_by("id").first()

            if not tenant:
                try:
                    tenant = Tenant.objects.create(
                        name="Tenant Local",
                        identifier="local",
                        domain=host or "localhost",
                        active=True,
                        commercial_status=Tenant.CommercialStatus.TRIAL,
                    )
                except Exception:
                    tenant = Tenant.objects.filter(identifier="local").order_by("id").first()
        except OperationalError:
            return JsonResponse({"error": "Base de dados indisponível."}, status=503)

        return tenant

    def _resolve_tenant(self, host):
        cache_key = f"tenant_domain:{host}"
        tenant_id = self._cache_get(cache_key)

        if tenant_id:
            tenant = Tenant.objects.only("id", "active").filter(id=tenant_id, active=True).first()
            if tenant:
                return tenant
            self._cache_delete(cache_key)

        tenant = Tenant.objects.only("id", "active").filter(domain=host, active=True).first()
        if tenant:
            self._cache_set(cache_key, tenant.id, self.CACHE_TIMEOUT)

        return tenant

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


InquilinoMiddleware = TenantMiddleware
