from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
import pytest

from apps.payments.models.reconciliation import Reconciliation
from apps.payments.models.transaction import Transaction
from apps.tenants.models.tenant import Tenant


def _tenant():
    return Tenant.objects.create(
        identifier="tn-payments-recon-actions",
        name="Tenant Payments Reconciliation Actions",
        domain="tenant-payments-reconciliation-actions.local",
        active=True,
    )


def _authenticate_admin(tenant, api_client):
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username="admin_payments_reconciliation_actions",
        email="admin-payments-reconciliation-actions@example.com",
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
def test_reconciliation_confirm_action_is_idempotent_and_legacy_alias_is_removed(api_client):
    tenant = _tenant()
    _authenticate_admin(tenant, api_client)

    transaction = Transaction.objects.create(
        external_reference="FAT-RECON-ACTION-1",
        gateway="stripe",
        status="confirmed",
        gateway_response="{}",
    )
    reconciliation = Reconciliation.objects.create(transaction=transaction, confirmed=False)

    response = api_client.post(f"/api/v1/payments/reconciliation/{reconciliation.id}/confirm/", {}, format="json")
    assert response.status_code == 200

    reconciliation.refresh_from_db()
    assert reconciliation.confirmed is True
    first_confirmation_date = reconciliation.confirmation_date
    assert first_confirmation_date is not None

    second_response = api_client.post(f"/api/v1/payments/reconciliation/{reconciliation.id}/confirm/", {}, format="json")
    assert second_response.status_code == 200

    reconciliation.refresh_from_db()
    assert reconciliation.confirmation_date == first_confirmation_date

    legacy_response = api_client.post(
        f"/api/v1/payments/reconciliation/{reconciliation.id}/confirmar/",
        {},
        format="json",
    )
    assert legacy_response.status_code == 404

    reconciliation.refresh_from_db()
    assert reconciliation.confirmation_date == first_confirmation_date
    assert Reconciliation.objects.filter(transaction=transaction).count() == 1
