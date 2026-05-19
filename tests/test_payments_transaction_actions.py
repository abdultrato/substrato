import json

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
import pytest

from apps.payments.models.reconciliation import Reconciliation
from apps.payments.models.transaction import Transaction
from apps.tenants.models.tenant import Tenant


def _response_data(response):
    if hasattr(response, "data"):
        return response.data
    return json.loads(response.content)


def _tenant():
    return Tenant.objects.create(
        identifier="tn-payments-actions",
        name="Tenant Payments Actions",
        domain="tenant-payments-actions.local",
        active=True,
    )


def _authenticate_admin(tenant, api_client):
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username="admin_payments_actions",
        email="admin-payments-actions@example.com",
        password="testpass123",
        tenant=tenant,
    )
    user.is_staff = True
    user.save(update_fields=["is_staff"])

    admin_group, _ = Group.objects.get_or_create(name="Administrador")
    user.groups.add(admin_group)

    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=user)
    return user


@pytest.mark.django_db
def test_transaction_verify_action_returns_gateway_payload_without_mutating_status(api_client, monkeypatch):
    tenant = _tenant()
    _authenticate_admin(tenant, api_client)

    class DummyGateway:
        name = "stripe"

        def status(self, reference):
            return {"status": "processing", "reference": reference}

    monkeypatch.setattr("application.payments.handlers.get_gateway", lambda name=None: DummyGateway())

    transaction = Transaction.objects.create(
        external_reference="FAT-VERIFY-1",
        gateway="stripe",
        status="pending",
        gateway_response="",
    )

    response = api_client.post(f"/api/v1/payments/transaction/{transaction.id}/verify/", {}, format="json")
    assert response.status_code == 200
    payload = _response_data(response)

    transaction.refresh_from_db()
    assert payload["transaction"]["id"] == transaction.id
    assert payload["gateway_payload"]["status"] == "processing"
    assert transaction.status == "pending"

    legacy_response = api_client.post(f"/api/v1/payments/transaction/{transaction.id}/verificar/", {}, format="json")
    assert legacy_response.status_code == 200


@pytest.mark.django_db
def test_transaction_reconcile_action_is_idempotent_and_creates_single_reconciliation(api_client, monkeypatch):
    tenant = _tenant()
    _authenticate_admin(tenant, api_client)

    class DummyGateway:
        name = "stripe"

        def status(self, reference):
            return {"status": "confirmed", "reference": reference}

    monkeypatch.setattr("application.payments.handlers.get_gateway", lambda name=None: DummyGateway())

    transaction = Transaction.objects.create(
        external_reference="FAT-RECON-1",
        gateway="stripe",
        status="pending",
        gateway_response="",
    )

    response = api_client.post(f"/api/v1/payments/transaction/{transaction.id}/reconcile/", {}, format="json")
    assert response.status_code == 200
    payload = _response_data(response)

    transaction.refresh_from_db()
    assert payload["transaction"]["status"] == "confirmed"
    assert payload["reconciliation"]["confirmed"] is True
    assert transaction.status == "confirmed"
    assert Reconciliation.objects.filter(transaction=transaction).count() == 1

    legacy_response = api_client.post(
        f"/api/v1/payments/transaction/{transaction.id}/reconciliar/",
        {},
        format="json",
    )
    assert legacy_response.status_code == 200
    assert Reconciliation.objects.filter(transaction=transaction).count() == 1

