from decimal import Decimal
import json

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
import pytest

from apps.billing.models.invoice import Invoice
from apps.billing.models.invoice_items import InvoiceItem
from apps.clinical.models.patient import Patient
from apps.payments.models.payment import Payment
from apps.payments.models.receipt import Receipt
from apps.tenants.models.tenant import Tenant


def _response_data(response):
    if hasattr(response, "data"):
        return response.data
    return json.loads(response.content)


def _tenant():
    return Tenant.objects.create(
        identifier="tn-payments-payment-actions",
        name="Tenant Payments Payment Actions",
        domain="tenant-payments-payment-actions.local",
        active=True,
    )


def _authenticate_admin(tenant, api_client):
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username="admin_payments_payment_actions",
        email="admin-payments-payment-actions@example.com",
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


def _issued_invoice(tenant):
    patient = Patient.objects.create(
        tenant=tenant,
        name="Paciente Payments Actions",
        gender="Masculino",
        address_street="Rua Payments Actions",
    )
    invoice = Invoice.objects.create(
        tenant=tenant,
        patient=patient,
        origin=Invoice.Origin.MIXED,
    )
    InvoiceItem.objects.create(
        tenant=tenant,
        invoice=invoice,
        item_type=InvoiceItem.TipoItem.AJUSTE,
        description="Ajuste actions",
        quantity=Decimal("1.00"),
        unit_price=Decimal("10.00"),
        applies_vat=False,
        vat_percentage=Decimal("0.00"),
    )
    invoice.issue()
    return invoice


@pytest.mark.django_db
def test_payment_confirm_action_is_idempotent_and_alias_works(api_client):
    tenant = _tenant()
    _authenticate_admin(tenant, api_client)
    invoice = _issued_invoice(tenant)

    payment = Payment.objects.create(
        tenant=tenant,
        invoice=invoice,
        name="Pagamento API Confirm",
        value=invoice.total,
        method=Payment.Method.CASH,
    )

    response = api_client.post(f"/api/v1/payments/payment/{payment.id}/confirm/", {}, format="json")
    assert response.status_code == 200
    payload = _response_data(response)
    assert payload["estado"] == Payment.Status.CONFIRMED

    legacy_response = api_client.post(f"/api/v1/payments/payment/{payment.id}/confirmar/", {}, format="json")
    assert legacy_response.status_code == 200
    legacy_payload = _response_data(legacy_response)
    assert legacy_payload["estado"] == Payment.Status.CONFIRMED
    assert Receipt.objects.filter(invoice=invoice).count() == 1


@pytest.mark.django_db
def test_payment_refund_action_is_idempotent_and_alias_works(api_client):
    tenant = _tenant()
    _authenticate_admin(tenant, api_client)
    invoice = _issued_invoice(tenant)

    payment = Payment.objects.create(
        tenant=tenant,
        invoice=invoice,
        name="Pagamento API Refund",
        value=invoice.total,
        method=Payment.Method.CASH,
    )
    payment.confirm()

    response = api_client.post(f"/api/v1/payments/payment/{payment.id}/refund/", {}, format="json")
    assert response.status_code == 200
    payload = _response_data(response)
    assert payload["estado"] == Payment.Status.REFUNDED

    legacy_response = api_client.post(f"/api/v1/payments/payment/{payment.id}/estornar/", {}, format="json")
    assert legacy_response.status_code == 200
    legacy_payload = _response_data(legacy_response)
    assert legacy_payload["estado"] == Payment.Status.REFUNDED


@pytest.mark.django_db
def test_payment_refund_action_rejects_pending_payment(api_client):
    tenant = _tenant()
    _authenticate_admin(tenant, api_client)
    invoice = _issued_invoice(tenant)

    payment = Payment.objects.create(
        tenant=tenant,
        invoice=invoice,
        name="Pagamento API Pending",
        value=invoice.total,
        method=Payment.Method.CASH,
    )

    response = api_client.post(f"/api/v1/payments/payment/{payment.id}/refund/", {}, format="json")
    assert response.status_code == 400
    payload = _response_data(response)
    assert "confirmados" in json.dumps(payload, ensure_ascii=False).lower()

