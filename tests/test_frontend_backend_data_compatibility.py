from decimal import Decimal
import json

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.utils import timezone
import pytest

from apps.clinical.models.patient import Patient
from apps.consultations.models.consultation_specialty import ConsultationSpecialty
from apps.external_entities.models.company import Company
from apps.tenants.models.tenant import Tenant


def _response_data(response):
    if hasattr(response, "data"):
        return response.data
    return json.loads(response.content)


def _tenant(*, identifier: str, domain: str):
    return Tenant.objects.create(
        identifier=identifier,
        name=f"Tenant {identifier}",
        domain=domain,
        active=True,
    )


def _authenticate_admin(tenant: Tenant, api_client):
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username=f"admin_{tenant.identifier}",
        email=f"{tenant.identifier}@example.com",
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
def test_consultations_accept_frontend_pt_payload_and_return_aliases(api_client):
    tenant = _tenant(identifier="tn-consults-compat", domain="consults-compat.local")
    _authenticate_admin(tenant, api_client)

    patient = Patient.objects.create(
        tenant=tenant,
        name="Paciente Compat",
        gender="Masculino",
        address_street="Rua Compat",
    )
    specialty = ConsultationSpecialty.objects.create(
        tenant=tenant,
        name="Clínica Geral",
        base_price=Decimal("150.00"),
        active=True,
    )

    scheduled_for = timezone.now().replace(microsecond=0).isoformat()
    response = api_client.post(
        "/api/v1/consultations/consultation/",
        {
            "paciente": patient.id,
            "especialidade": specialty.id,
            "agendada_para": scheduled_for,
            "feriado_manual": True,
        },
        format="json",
    )

    assert response.status_code == 201, _response_data(response)
    payload = _response_data(response)

    assert payload["patient"] == patient.id
    assert payload["paciente"] == patient.id
    assert payload["specialty"] == specialty.id
    assert payload["especialidade"] == specialty.id
    assert payload["manual_holiday"] is True
    assert payload["feriado_manual"] is True
    assert payload["patient_name"] == patient.name
    assert payload["paciente_nome"] == patient.name
    assert payload["status"] == payload["estado"]
    assert payload["scheduled_for"] == payload["agendada_para"]


@pytest.mark.django_db
def test_consultation_price_preview_uses_english_route_and_preserves_pt_aliases(api_client):
    tenant = _tenant(identifier="tn-consults-price", domain="consults-price.local")
    _authenticate_admin(tenant, api_client)

    specialty = ConsultationSpecialty.objects.create(
        tenant=tenant,
        name="Pediatria",
        base_price=Decimal("250.00"),
        active=True,
    )

    response = api_client.get(
        f"/api/v1/consultations/consultation/price/?especialidade={specialty.id}&feriado_manual=true"
    )

    assert response.status_code == 200, _response_data(response)
    payload = _response_data(response)

    assert payload["specialty"] == specialty.id
    assert payload["especialidade"] == specialty.id
    assert payload["specialty_name"] == specialty.name
    assert payload["especialidade_nome"] == specialty.name
    assert payload["manual_holiday"] is True
    assert payload["feriado_manual"] is True
    assert payload["price_final"] == payload["preco_final"]
    assert payload["currency"] == payload["moeda"]
    assert api_client.get(f"/api/v1/consultations/consultation/preco/?especialidade={specialty.id}").status_code == 404


@pytest.mark.django_db
def test_entities_accept_frontend_pt_payload_and_alias_route(api_client):
    tenant = _tenant(identifier="tn-entities-compat", domain="entities-compat.local")
    _authenticate_admin(tenant, api_client)

    response = api_client.post(
        "/api/v1/entities/company/",
        {
            "nome": "Empresa Compat",
            "endereco_sede": "Maputo",
            "contactos": "RH",
            "telefone1": "+258840000000",
            "telefone2": "+258850000000",
            "email": "contato@empresa-compat.local",
            "nuit": "123456789",
            "nib": "0001000200030004",
            "observacoes": "Criada via payload PT",
            "ativo": True,
        },
        format="json",
    )

    assert response.status_code == 201, _response_data(response)
    payload = _response_data(response)

    assert payload["name"] == "Empresa Compat"
    assert payload["nome"] == "Empresa Compat"
    assert payload["headquarters_address"] == "Maputo"
    assert payload["endereco_sede"] == "Maputo"
    assert payload["phone1"] == "+258840000000"
    assert payload["telefone1"] == "+258840000000"
    assert payload["notes"] == "Criada via payload PT"
    assert payload["observacoes"] == "Criada via payload PT"
    assert payload["active"] is True
    assert payload["ativo"] is True

    company = Company.objects.get(pk=payload["id"])
    assert company.name == "Empresa Compat"
    assert company.headquarters_address == "Maputo"
    assert company.phone1 == "+258840000000"
    assert company.active is True
