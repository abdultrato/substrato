from decimal import Decimal
import json

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
import pytest

from apps.billing.models.invoice import Invoice
from apps.clinical.models.patient import Patient
from apps.tenants.models.tenant import Tenant


def _response_data(response):
    if hasattr(response, "data"):
        return response.data
    return json.loads(response.content)


def _tenant():
    return Tenant.objects.create(
        identifier="tn-roundtrip",
        name="Tenant Roundtrip",
        domain="roundtrip.local",
        active=True,
    )


def _patient(tenant: Tenant):
    return Patient.objects.create(
        tenant=tenant,
        name="Paciente Roundtrip",
        gender="Masculino",
        address_street="Rua Integração",
    )


def _authenticate_admin(tenant: Tenant, api_client):
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username="admin_roundtrip",
        email="admin-roundtrip@example.com",
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
def test_frontend_create_is_visible_in_backend_model(api_client):
    """
    Frontend -> Backend:
    cria via endpoint consumido pelo frontend e valida persistência no ORM.
    """
    tenant = _tenant()
    _authenticate_admin(tenant, api_client)
    patient = _patient(tenant)

    response = api_client.post(
        "/api/v1/billing/invoice/",
        {
            "paciente": patient.id,
            "origem": "MIX",
        },
        format="json",
    )

    assert response.status_code == 201, _response_data(response)
    payload = _response_data(response)

    invoice = Invoice.objects.get(pk=payload["id"])
    assert invoice.patient_id == patient.id
    assert invoice.origin == Invoice.Origin.MIXED
    assert invoice.total == Decimal("0.00")


@pytest.mark.django_db
def test_backend_create_is_visible_in_frontend_api_contract(api_client):
    """
    Backend -> Frontend:
    cria diretamente no ORM e valida leitura no endpoint usado pelo frontend.
    """
    tenant = _tenant()
    _authenticate_admin(tenant, api_client)
    patient = _patient(tenant)

    invoice = Invoice.objects.create(
        tenant=tenant,
        patient=patient,
        origin=Invoice.Origin.CLINICAL,
    )

    response = api_client.get(f"/api/v1/billing/invoice/{invoice.id}/")
    assert response.status_code == 200, _response_data(response)
    payload = _response_data(response)

    assert payload["id"] == invoice.id
    assert payload["paciente"] == patient.id
    assert payload["origem"] == Invoice.Origin.CLINICAL

