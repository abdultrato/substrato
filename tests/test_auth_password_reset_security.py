import re

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
import pytest

from apps.identity.models.password_reset_token import PasswordResetToken
from apps.tenants.models.tenant import Tenant


def _tenant():
    return Tenant.objects.create(
        identifier="tn-password-reset-security",
        name="Tenant Password Reset Security",
        domain="tenant-password-reset-security.local",
        active=True,
    )


def _user(tenant, **kwargs):
    defaults = {
        "username": "reset_user",
        "email": "reset-user@example.com",
        "password": "OldStrongPass123!",
        "tenant": tenant,
    }
    defaults.update(kwargs)
    return get_user_model().objects.create_user(**defaults)


def _authenticate_admin(tenant, api_client):
    user = _user(
        tenant,
        username="reset_admin",
        email="reset-admin@example.com",
        password="AdminStrongPass123!",
    )
    user.is_staff = True
    user.save(update_fields=["is_staff"])
    admin_group, _ = Group.objects.get_or_create(name="Administrador")
    user.groups.add(admin_group)
    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=user)
    return user


@pytest.mark.django_db
def test_password_reset_token_is_hashed_and_confirmation_uses_sent_code(api_client, monkeypatch):
    tenant = _tenant()
    user = _user(tenant)
    api_client.defaults["HTTP_HOST"] = tenant.domain

    sent_messages = []

    def fake_send(self, **kwargs):
        sent_messages.append(kwargs["message"])

    monkeypatch.setattr("api.v1.auth.views.NotificationService.send", fake_send)

    request_response = api_client.post(
        "/api/v1/auth/password-reset/request/",
        {"email": user.email, "channel": "email"},
        format="json",
    )
    assert request_response.status_code == 200
    assert len(sent_messages) == 1

    raw_token = re.search(r"Código: (?P<token>.+)", sent_messages[0]).group("token").strip()
    token_obj = PasswordResetToken.objects.get(user=user)

    assert token_obj.token != raw_token
    assert PasswordResetToken.is_hashed_token(token_obj.token)
    assert token_obj.matches(raw_token)

    confirm_response = api_client.post(
        "/api/v1/auth/password-reset/confirm/",
        {"token": raw_token, "new_password": "NewStrongPass123!"},
        format="json",
    )
    assert confirm_response.status_code == 204

    user.refresh_from_db()
    token_obj.refresh_from_db()
    assert user.check_password("NewStrongPass123!")
    assert token_obj.used is True


@pytest.mark.django_db
def test_password_reset_token_crud_route_is_not_registered(api_client):
    tenant = _tenant()
    _authenticate_admin(tenant, api_client)

    response = api_client.get("/api/v1/identity/passwordresettoken/")

    assert response.status_code == 404


def test_metrics_endpoint_is_closed_without_token_outside_debug(settings, api_client):
    settings.DEBUG = False
    settings.PROMETHEUS_BEARER_TOKEN = ""

    response = api_client.get("/metrics")

    assert response.status_code == 404


def test_metrics_endpoint_rejects_wrong_bearer_token(settings, api_client):
    settings.DEBUG = True
    settings.PROMETHEUS_BEARER_TOKEN = "expected-token"

    response = api_client.get("/metrics", HTTP_AUTHORIZATION="Bearer wrong-token")

    assert response.status_code == 404
