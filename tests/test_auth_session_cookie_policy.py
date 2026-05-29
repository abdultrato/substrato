from django.test import RequestFactory
from rest_framework.response import Response

from api.v1.auth.views import COOKIE_ACCESS_NAME, COOKIE_REFRESH_NAME, _set_jwt_cookies


def test_login_session_settings_expire_after_idle_and_browser_close(settings):
    assert settings.SESSION_IDLE_TIMEOUT_MINUTES == 30
    assert settings.SESSION_COOKIE_AGE == 30 * 60
    assert settings.SESSION_SAVE_EVERY_REQUEST is True
    assert settings.SESSION_EXPIRE_AT_BROWSER_CLOSE is True


def test_jwt_cookies_are_browser_session_cookies_by_default(settings):
    settings.AUTH_COOKIE_SESSION_ONLY = True
    request = RequestFactory().get("/")
    response = Response()

    _set_jwt_cookies(response, request, access="access-token", refresh="refresh-token")

    assert response.cookies[COOKIE_ACCESS_NAME]["max-age"] == ""
    assert response.cookies[COOKIE_ACCESS_NAME]["expires"] == ""
    assert response.cookies[COOKIE_REFRESH_NAME]["max-age"] == ""
    assert response.cookies[COOKIE_REFRESH_NAME]["expires"] == ""


def test_jwt_cookies_can_use_configured_max_age_when_not_session_only(settings):
    settings.AUTH_COOKIE_SESSION_ONLY = False
    request = RequestFactory().get("/")
    response = Response()

    _set_jwt_cookies(response, request, access="access-token", refresh="refresh-token")

    assert str(response.cookies[COOKIE_ACCESS_NAME]["max-age"]) == "1800"
    assert str(response.cookies[COOKIE_REFRESH_NAME]["max-age"]) == "1800"
