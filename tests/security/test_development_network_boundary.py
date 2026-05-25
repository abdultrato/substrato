from django.conf import settings


def test_development_settings_do_not_default_to_wildcard_network_boundary():
    assert "*" not in settings.ALLOWED_HOSTS
    assert settings.CORS_ALLOW_ALL_ORIGINS is False
    assert settings.USE_X_FORWARDED_HOST is False
    assert "http://127.0.0.1:5000" in settings.CORS_ALLOWED_ORIGINS


def test_health_rejects_untrusted_host_header(client):
    response = client.get("/health/live/", HTTP_HOST="evil.example")

    assert response.status_code == 400
    assert b"DisallowedHost" not in response.content
    assert b"ALLOWED_HOSTS" not in response.content


def test_health_rejects_untrusted_host_even_with_forwarded_local_host(client):
    response = client.get(
        "/health/live/",
        HTTP_HOST="evil.example",
        HTTP_X_FORWARDED_HOST="127.0.0.1",
    )

    assert response.status_code == 400
    assert b"DisallowedHost" not in response.content
    assert b"ALLOWED_HOSTS" not in response.content


def test_cors_does_not_reflect_untrusted_origin(client):
    response = client.get(
        "/health/live/",
        HTTP_HOST="127.0.0.1",
        HTTP_ORIGIN="http://evil.example",
    )

    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") != "http://evil.example"
    assert "access-control-allow-credentials" not in response.headers


def test_cors_allows_local_frontend_origin(client):
    origin = "http://127.0.0.1:5000"
    response = client.get(
        "/health/live/",
        HTTP_HOST="127.0.0.1",
        HTTP_ORIGIN=origin,
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
    assert response.headers["access-control-allow-credentials"] == "true"


def test_debug_media_path_traversal_returns_generic_bad_request(client):
    response = client.get("/media/..%2F.env", HTTP_HOST="127.0.0.1")

    assert response.status_code in {400, 404}
    assert b"SuspiciousFileOperation" not in response.content
    assert b"Traceback" not in response.content
    assert b"SECRET_KEY" not in response.content
    assert b"PASSWORD" not in response.content
