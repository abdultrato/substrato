from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import HttpResponse, JsonResponse
from django.urls import include, path
from django.views.decorators.http import require_GET
from django_prometheus.exports import ExportToDjangoView
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView


@require_GET
def health_live(request):
    # Liveness probe: processo respondeu (sem depender de serviços externos).
    return JsonResponse({"status": "ok"})


@require_GET
def health_ready(request):
    # Readiness probe: depende de DB e Redis estarem acessíveis.
    status_code = 200
    checks = {"database": False, "redis": False}

    try:
        from django.db import connection

        connection.ensure_connection()
        checks["database"] = True
    except Exception:
        status_code = 503

    try:
        from django.conf import settings
        import redis

        r = redis.from_url(getattr(settings, "REDIS_URL", "redis://localhost:6379/0"))
        r.ping()
        checks["redis"] = True
    except Exception:
        status_code = 503

    return JsonResponse(
        {"status": "ok" if status_code == 200 else "error", **checks},
        status=status_code,
    )


@require_GET
def prometheus_metrics(request):
    """
    /metrics (django-prometheus)

    Hardening:
    - Se PROMETHEUS_BEARER_TOKEN estiver definido, exige
      `Authorization: Bearer <token>` e responde 404 caso não corresponda.
    """

    token = getattr(settings, "PROMETHEUS_BEARER_TOKEN", "") or ""
    if token:
        auth = (request.headers.get("Authorization") or request.META.get("HTTP_AUTHORIZATION") or "").strip()
        if auth != f"Bearer {token}":
            return HttpResponse(status=404)

    return ExportToDjangoView(request)


urlpatterns = [
    path("health/live", health_live),
    path("health/live/", health_live),
    path("health/ready", health_ready),
    path("health/ready/", health_ready),
    path("metrics", prometheus_metrics),
    path("metrics/", prometheus_metrics),
    path("admin/", admin.site.urls),
    # API
    path("api/", include("api.urls")),
    path("pdf/", include("tasks.gerar_pdf.urls")),
    # OpenAPI Schema & Documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
