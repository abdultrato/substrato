from decimal import Decimal
import json
from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
import pytest

import application.payments.start_payment as start_payment_module
from apps.billing.models.invoice import Invoice
from apps.clinical.models.patient import Patient
from apps.tenants.models.tenant import Tenant


def _response_data(response):
    if hasattr(response, "data"):
        return response.data
    return json.loads(response.content)


def _payload_list(response):
    payload = _response_data(response)
    if isinstance(payload, dict) and "results" in payload:
        return payload["results"]
    return payload


def _tenant():
    return Tenant.objects.create(
        identifier="tn-http",
        name="Tenant HTTP",
        domain="tenant-http.local",
        active=True,
    )


def _patient(tenant):
    return Patient.objects.create(
        tenant=tenant,
        name="Paciente HTTP",
        gender="Masculino",
        address_street="Rua API",
    )


def _authenticate_admin(tenant, api_client=None):
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username="admin_http",
        email="admin-http@example.com",
        password="testpass123",
        tenant=tenant,
    )
    user.is_staff = True
    user.save(update_fields=["is_staff"])

    admin_group, _ = Group.objects.get_or_create(name="Administrador")
    user.groups.add(admin_group)
    if api_client is not None:
        api_client.defaults["HTTP_HOST"] = tenant.domain
        api_client.force_authenticate(user=user)
    return user


@pytest.mark.django_db
def test_clinical_alias_route_exposes_frontend_patient_contract(api_client):
    tenant = _tenant()
    patient = _patient(tenant)
    _authenticate_admin(tenant, api_client=api_client)

    response = api_client.get(f"/api/v1/clinical/patient/{patient.id}/")

    assert response.status_code == 200
    payload = _response_data(response)
    assert payload["id"] == patient.id
    assert payload["nome"] == patient.name
    assert "id_custom" in payload


@pytest.mark.django_db
def test_billing_and_payment_alias_endpoints_support_frontend_flow(api_client):
    tenant = _tenant()
    _authenticate_admin(tenant, api_client=api_client)
    patient = _patient(tenant)

    invoice_response = api_client.post(
        "/api/v1/billing/invoice/",
        {
            "paciente": patient.id,
            "origem": "MIX",
        },
        format="json",
    )

    assert invoice_response.status_code == 201
    invoice_payload = _response_data(invoice_response)
    assert invoice_payload["paciente"] == patient.id
    assert invoice_payload["origem"] == Invoice.Origin.MIXED
    assert "criado_por_nome" in invoice_payload
    assert "criado_por_departamento" in invoice_payload
    assert "setores_itens_faturados" in invoice_payload
    assert invoice_payload["total_a_pagar"] == "0.00"
    assert invoice_payload["valor_a_pagar"] == "0.00"

    invoice_id = invoice_payload["id"]

    item_response = api_client.post(
        "/api/v1/billing/invoiceitem/",
        {
            "fatura": invoice_id,
            "tipo_item": "AJU",
            "descricao": "Taxa administrativa",
            "quantidade": "1.00",
            "preco_unitario": "10.00",
            "aplica_iva": True,
            "iva_percentual": "16.00",
        },
        format="json",
    )

    assert item_response.status_code == 201
    item_payload = _response_data(item_response)
    assert item_payload["descricao"] == "Taxa administrativa"
    assert item_payload["preco_unitario"] == "10.00"
    assert item_payload["aplica_iva"] is True
    assert item_payload["iva_percentual"] == "16.00"
    assert item_payload["iva_valor"] == "1.60"
    assert item_payload["total_com_iva"] == "11.60"
    assert item_payload["setor_item_faturado"] == "Ajuste manual"

    invoice = Invoice.objects.get(pk=invoice_id)
    assert invoice.total == Decimal("11.60")

    invoice_detail_response = api_client.get(f"/api/v1/billing/invoice/{invoice_id}/")
    assert invoice_detail_response.status_code == 200
    invoice_detail_payload = _response_data(invoice_detail_response)
    assert "Ajuste manual" in invoice_detail_payload["setores_itens_faturados"]
    assert invoice_detail_payload["total_a_pagar"] == "11.60"
    assert invoice_detail_payload["valor_a_pagar"] == "11.60"

    update_response = api_client.patch(
        f"/api/v1/billing/invoiceitem/{item_payload['id']}/",
        {"aplica_iva": False},
        format="json",
    )

    assert update_response.status_code == 200
    updated_payload = _response_data(update_response)
    assert updated_payload["aplica_iva"] is False
    assert updated_payload["iva_valor"] == "0.00"
    assert updated_payload["total_com_iva"] == "10.00"

    invoice.refresh_from_db()
    assert invoice.total == Decimal("10.00")
    assert invoice.total_a_pagar == Decimal("10.00")

    issue_response = api_client.post(f"/api/v1/billing/invoice/{invoice_id}/emitir/")
    assert issue_response.status_code == 200

    payment_response = api_client.post(
        "/api/v1/payments/payment/",
        {
            "fatura": invoice_id,
            "nome": "Pagamento Front",
            "valor": "10.00",
            "metodo": "DIN",
        },
        format="json",
    )

    assert payment_response.status_code == 201, _response_data(payment_response)
    payment_payload = _response_data(payment_response)
    assert payment_payload["fatura"] == invoice_id
    assert payment_payload["nome"] == "Pagamento Front"
    assert payment_payload["valor"] == "10.00"
    assert payment_payload["estado"] == "PEN"

    confirm_response = api_client.post(f"/api/v1/billing/invoice/{invoice_id}/confirmar_pagamento/")

    assert confirm_response.status_code == 200
    assert _response_data(confirm_response)["estado"] == Invoice.Status.PAID

    receipt_response = api_client.get(f"/api/v1/payments/receipt/?fatura={invoice_id}")

    assert receipt_response.status_code == 200
    receipts = _payload_list(receipt_response)
    assert len(receipts) == 1
    assert receipts[0]["numero"].startswith("REC-")
    assert receipts[0]["valor"] == "10.00"


@pytest.mark.django_db
def test_payment_api_rejects_confirmed_overpayment_without_change(api_client):
    tenant = _tenant()
    _authenticate_admin(tenant, api_client=api_client)
    patient = _patient(tenant)

    invoice_response = api_client.post(
        "/api/v1/billing/invoice/",
        {
            "paciente": patient.id,
            "origem": "MIX",
        },
        format="json",
    )
    assert invoice_response.status_code == 201
    invoice_id = _response_data(invoice_response)["id"]

    item_response = api_client.post(
        "/api/v1/billing/invoiceitem/",
        {
            "fatura": invoice_id,
            "tipo_item": "AJU",
            "descricao": "Taxa administrativa",
            "quantidade": "1.00",
            "preco_unitario": "10.00",
            "aplica_iva": False,
            "iva_percentual": "0.00",
        },
        format="json",
    )
    assert item_response.status_code == 201

    issue_response = api_client.post(f"/api/v1/billing/invoice/{invoice_id}/emitir/")
    assert issue_response.status_code == 200

    payment_response = api_client.post(
        "/api/v1/payments/payment/",
        {
            "fatura": invoice_id,
            "nome": "Pagamento com excesso",
            "valor": "15.00",
            "metodo": "DIN",
            "estado": "CON",
        },
        format="json",
    )

    assert payment_response.status_code == 400
    payload = _response_data(payment_response)
    detail_text = json.dumps(payload, ensure_ascii=False)
    assert "change_amount" in detail_text or "troco" in detail_text


def test_start_payment_uses_gateway_registry_and_requires_phone_for_mobile_money(monkeypatch):
    captured = {}

    class DummyGateway:
        name = "stripe"

        def __init__(self):
            self.calls = []

        def charge(self, amount, reference, phone=None):
            self.calls.append((amount, reference, phone))
            return {"status": "processing", "transaction_id": "tx-1"}

    gateway = DummyGateway()

    def fake_create(**kwargs):
        captured.update(kwargs)
        return kwargs

    monkeypatch.setattr(start_payment_module, "get_gateway", lambda name=None: gateway)
    monkeypatch.setattr(start_payment_module.Transaction.objects, "create", fake_create)

    transaction = start_payment_module.start_payment(
        SimpleNamespace(id=77),
        Decimal("55.00"),
        gateway_name="stripe",
    )

    assert transaction["gateway"] == "stripe"
    assert captured["external_reference"] == "FAT-77"
    assert captured["gateway"] == "stripe"
    assert gateway.calls == [(Decimal("55.00"), "FAT-77", None)]

    monkeypatch.setattr(
        start_payment_module,
        "get_gateway",
        lambda name=None: type(
            "MobileGateway",
            (),
            {"name": "mpesa", "charge": lambda self, amount, reference, phone=None: {"status": "pending"}},
        )(),
    )

    with pytest.raises(ValueError, match=r"Telefone .*obrigat"):
        start_payment_module.start_payment(
            SimpleNamespace(id=88),
            Decimal("20.00"),
            gateway_name="mpesa",
        )
