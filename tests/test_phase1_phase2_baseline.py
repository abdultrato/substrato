from datetime import timedelta
from types import SimpleNamespace

from django.contrib.auth.models import AnonymousUser
from django.test import RequestFactory
from rest_framework.routers import SimpleRouter

from api.v1.permissions import OnlyAdmin
from api.v1.routing.routes import register_routes
from security.permissions.rbac import RBACPermission


def test_rest_framework_defaults_are_authenticated_and_jwt(settings):
    assert settings.REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"] == [
        "rest_framework.permissions.IsAuthenticated",
    ]
    assert settings.REST_FRAMEWORK["DEFAULT_AUTHENTICATION_CLASSES"] == [
        "security.authenticacao.JWTAuth",
    ]
    assert settings.REST_FRAMEWORK["EXCEPTION_HANDLER"] == "api.v1.exceptions.custom_exception_handler"


def test_session_and_cookie_security_baseline(settings):
    assert settings.SESSION_IDLE_TIMEOUT_MINUTES == 30
    assert settings.SESSION_COOKIE_AGE == 30 * 60
    assert settings.SESSION_SAVE_EVERY_REQUEST is True
    assert settings.SESSION_EXPIRE_AT_BROWSER_CLOSE is True
    assert settings.AUTH_COOKIE_SESSION_ONLY is True
    assert settings.SESSION_COOKIE_HTTPONLY is True
    assert settings.CSRF_COOKIE_HTTPONLY is True
    assert settings.SESSION_COOKIE_SAMESITE == "Lax"
    assert settings.CSRF_COOKIE_SAMESITE == "Lax"
    assert settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"] == timedelta(minutes=30)
    assert settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"] == timedelta(minutes=30)


def test_registered_viewsets_use_rbac_by_default():
    router = register_routes(SimpleRouter())
    permission_exceptions = {"monitoring-export_job", "monitoring-cloud_control"}

    assert router.registry
    for _route, viewset, basename in router.registry:
        if basename in permission_exceptions:
            continue
        assert viewset.permission_classes == [RBACPermission], basename


def test_only_admin_requires_authenticated_staff_user():
    request = RequestFactory().get("/api/v1/config/feature-flags/")
    permission = OnlyAdmin()

    request.user = AnonymousUser()
    assert permission.has_permission(request, view=None) is False

    request.user = SimpleNamespace(is_authenticated=True, is_staff=False)
    assert permission.has_permission(request, view=None) is False

    request.user = SimpleNamespace(is_authenticated=True, is_staff=True, tenant_id=None)
    request.tenant = None
    assert permission.has_permission(request, view=None) is True
