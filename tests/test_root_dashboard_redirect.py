import pytest

from infrastructure.middleware import tenant as tenant_middleware


@pytest.mark.django_db
def test_root_redirects_to_admin_login(client):
    response = client.get("/", follow=False)

    assert response.status_code == 302
    assert response["Location"] == "/admin/login/?next=/admin/"


@pytest.mark.django_db
def test_dashboard_redirects_to_admin_and_then_login_when_anonymous(client):
    response = client.get("/dashboard/", follow=False)

    assert response.status_code == 302
    assert response["Location"] == "/admin/"

    admin_response = client.get(response["Location"], follow=False)
    assert admin_response.status_code == 302
    assert admin_response["Location"].startswith("/admin/login/?next=/admin/")


@pytest.mark.django_db
def test_root_redirect_is_fast_path_without_db_check(client, monkeypatch):
    def _fail_if_called(*args, **kwargs):
        raise AssertionError("DB check should not run for fast redirect paths.")

    monkeypatch.setattr(tenant_middleware.connection, "close_if_unusable_or_obsolete", _fail_if_called)
    monkeypatch.setattr(tenant_middleware.connection, "ensure_connection", _fail_if_called)

    response = client.get("/", follow=False)
    assert response.status_code == 302
    assert response["Location"] == "/admin/login/?next=/admin/"


@pytest.mark.django_db
def test_dashboard_redirect_is_fast_path_without_db_check(client, monkeypatch):
    def _fail_if_called(*args, **kwargs):
        raise AssertionError("DB check should not run for fast redirect paths.")

    monkeypatch.setattr(tenant_middleware.connection, "close_if_unusable_or_obsolete", _fail_if_called)
    monkeypatch.setattr(tenant_middleware.connection, "ensure_connection", _fail_if_called)

    response = client.get("/dashboard/", follow=False)
    assert response.status_code == 302
    assert response["Location"] == "/admin/"
