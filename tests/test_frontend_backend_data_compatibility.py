from decimal import Decimal
import json

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.utils import timezone
import pytest

from apps.billing.models.invoice import Invoice
from apps.billing.models.invoice_items import InvoiceItem
from apps.clinical.models.lab_exam import LabExam
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.lab_request_item import LabRequestItem
from apps.clinical.models.patient import Patient
from apps.clinical.models.sample import Sample
from apps.consultations.models.consultation_specialty import ConsultationSpecialty
from apps.consultations.models.medical_consultation import MedicalConsultation
from apps.external_entities.models.company import Company
from apps.tenants.models.tenant import Tenant
from core.constants.laboratory.method import Method
from core.constants.laboratory.sector import Sector


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
def test_consultations_use_english_payload_and_reject_legacy_aliases(api_client):
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
            "patient": patient.id,
            "specialty": specialty.id,
            "scheduled_for": scheduled_for,
            "manual_holiday": True,
        },
        format="json",
    )

    assert response.status_code == 201, _response_data(response)
    payload = _response_data(response)

    assert payload["patient"] == patient.id
    assert payload["specialty"] == specialty.id
    assert payload["specialty_name"] == specialty.name
    assert payload["manual_holiday"] is True
    assert payload["patient_name"] == patient.name
    assert "paciente" not in payload
    assert "especialidade" not in payload
    assert "agendada_para" not in payload

    legacy_response = api_client.post(
        "/api/v1/consultations/consultation/",
        {
            "paciente": patient.id,
            "especialidade": specialty.id,
            "agendada_para": scheduled_for,
            "feriado_manual": True,
        },
        format="json",
    )
    assert legacy_response.status_code == 400


@pytest.mark.django_db
def test_consultation_price_preview_uses_english_contract(api_client):
    tenant = _tenant(identifier="tn-consults-price", domain="consults-price.local")
    _authenticate_admin(tenant, api_client)

    specialty = ConsultationSpecialty.objects.create(
        tenant=tenant,
        name="Pediatria",
        base_price=Decimal("250.00"),
        active=True,
    )

    response = api_client.get(
        f"/api/v1/consultations/consultation/price/?specialty={specialty.id}&manual_holiday=true"
    )

    assert response.status_code == 200, _response_data(response)
    payload = _response_data(response)

    assert payload["specialty"] == specialty.id
    assert payload["specialty_name"] == specialty.name
    assert payload["manual_holiday"] is True
    assert "especialidade" not in payload
    assert "preco_final" not in payload
    assert "moeda" not in payload
    assert api_client.get(
        f"/api/v1/consultations/consultation/price/?especialidade={specialty.id}&feriado_manual=true"
    ).status_code == 400
    assert api_client.get(f"/api/v1/consultations/consultation/preco/?especialidade={specialty.id}").status_code == 404


@pytest.mark.django_db
def test_consultation_invoice_preview_and_selected_draft_items(api_client):
    tenant = _tenant(identifier="tn-consults-invoice-preview", domain="consults-invoice-preview.local")
    _authenticate_admin(tenant, api_client)

    patient = Patient.objects.create(
        tenant=tenant,
        name="Paciente Fatura Consulta",
        gender="Masculino",
        address_street="Rua Fatura",
    )
    specialty = ConsultationSpecialty.objects.create(
        tenant=tenant,
        name="Estomatologia",
        base_price=Decimal("500.00"),
        active=True,
        vat_percentage=Decimal("0.00"),
    )
    consultation = MedicalConsultation.objects.create(
        tenant=tenant,
        patient=patient,
        specialty=specialty,
        scheduled_for=timezone.now(),
    )

    sample = Sample.objects.create(
        tenant=tenant,
        name="Sangue",
        bottle_type=Sample.BottleType.EDTA_TUBE,
    )
    exam = LabExam.objects.create(
        tenant=tenant,
        name="Hemograma",
        price=Decimal("120.00"),
        method=Method.ENZIMATICO,
        sector=Sector.HEMATOLOGIA,
        turnaround_hours=4,
        sample_type=sample,
    )
    lab_request = LabRequest.objects.create(tenant=tenant, patient=patient)
    LabRequestItem.objects.create(tenant=tenant, request=lab_request, exam=exam)

    preview_response = api_client.get(f"/api/v1/consultations/consultation/{consultation.id}/invoice-preview/")
    assert preview_response.status_code == 200, _response_data(preview_response)
    preview = _response_data(preview_response)
    keys = {item["key"] for item in preview["items"]}
    assert f"consultation:{consultation.id}" in keys
    assert f"exam:{exam.id}" in keys

    response = api_client.post(
        f"/api/v1/consultations/consultation/{consultation.id}/create-invoice/",
        {
            "issue": False,
            "selected_items": [f"consultation:{consultation.id}"],
        },
        format="json",
    )
    assert response.status_code == 200, _response_data(response)
    payload = _response_data(response)
    invoice = Invoice.objects.get(pk=payload["invoice_id"])
    items = list(invoice.items.filter(deleted=False))

    assert invoice.status == Invoice.Status.DRAFT
    assert invoice.origin == Invoice.Origin.MIXED
    assert len(items) == 1
    assert items[0].item_type == InvoiceItem.TipoItem.CONSULTATION
    assert items[0].consultation_id == consultation.id


@pytest.mark.django_db
def test_consultation_invoice_can_be_saved_as_proforma(api_client):
    tenant = _tenant(identifier="tn-consults-proforma", domain="consults-proforma.local")
    _authenticate_admin(tenant, api_client)

    patient = Patient.objects.create(
        tenant=tenant,
        name="Paciente Proforma Consulta",
        gender="Masculino",
        address_street="Rua Proforma",
    )
    specialty = ConsultationSpecialty.objects.create(
        tenant=tenant,
        name="Clínica Proforma",
        base_price=Decimal("350.00"),
        active=True,
        vat_percentage=Decimal("0.00"),
    )
    consultation = MedicalConsultation.objects.create(
        tenant=tenant,
        patient=patient,
        specialty=specialty,
        scheduled_for=timezone.now(),
    )

    response = api_client.post(
        f"/api/v1/consultations/consultation/{consultation.id}/create-invoice/",
        {
            "invoice_type": "proforma",
            "issue": False,
            "selected_items": [f"consultation:{consultation.id}"],
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    payload = _response_data(response)
    invoice = Invoice.objects.get(pk=payload["invoice_id"])
    items = list(invoice.items.filter(deleted=False))

    assert payload["invoice_origin"] == Invoice.Origin.PROFORMA
    assert invoice.status == Invoice.Status.DRAFT
    assert invoice.origin == Invoice.Origin.PROFORMA
    assert len(items) == 1
    assert items[0].item_type == InvoiceItem.TipoItem.CONSULTATION
    assert items[0].consultation_id == consultation.id


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
