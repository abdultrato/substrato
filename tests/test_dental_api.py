from decimal import Decimal
import json

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.utils import timezone
import pytest

from apps.clinical.models.patient import Patient
from apps.dental.models import (
    DentalAppointment,
    DentalOdontogramEntry,
    DentalProcedure,
    DentalRecord,
    DentalTreatmentPlan,
    DentalTreatmentPlanItem,
)
from apps.tenants.models.tenant import Tenant


def _response_data(response):
    if hasattr(response, "data"):
        return response.data
    return json.loads(response.content)


def _items(response):
    payload = _response_data(response)
    if isinstance(payload, dict) and isinstance(payload.get("results"), list):
        return payload["results"]
    if isinstance(payload, list):
        return payload
    return []


def _tenant():
    return Tenant.objects.create(
        identifier="tn-dental",
        name="Tenant Dental",
        domain="tenant-dental.local",
        active=True,
    )


def _patient(tenant):
    return Patient.objects.create(
        tenant=tenant,
        name="Paciente Odonto",
        gender="Masculino",
        address_street="Rua Clínica",
    )


def _authenticate_admin(tenant, api_client):
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username="admin-dental",
        email="admin-dental@example.com",
        password="testpass123",
        tenant=tenant,
    )
    group, _ = Group.objects.get_or_create(name="Administrador")
    user.groups.add(group)
    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=user)
    return user


@pytest.mark.django_db
def test_dental_models_propagate_tenant_and_validate_tooth_number():
    tenant = _tenant()
    patient = _patient(tenant)
    procedure = DentalProcedure.objects.create(
        tenant=tenant,
        code="REST-001",
        name="Restauração",
        base_price=Decimal("150.00"),
        requires_prosthesis_lab=True,
    )
    appointment = DentalAppointment.objects.create(
        patient=patient,
        scheduled_start=timezone.now(),
        reason="Dor no dente 11",
    )
    record = DentalRecord.objects.create(patient=patient, appointment=appointment, chief_complaint="Dor")
    odontogram = DentalOdontogramEntry.objects.create(
        record=record,
        tooth_number="11",
        surface="V",
        condition="CARIES",
        procedure=procedure,
    )
    plan = DentalTreatmentPlan.objects.create(patient=patient, record=record, title="Tratamento inicial")
    item = DentalTreatmentPlanItem.objects.create(
        treatment_plan=plan,
        procedure=procedure,
        tooth_number="11",
        surface="V",
    )

    assert appointment.tenant == tenant
    assert record.tenant == tenant
    assert odontogram.tenant == tenant
    assert plan.tenant == tenant
    assert item.tenant == tenant
    assert item.unit_price == Decimal("150.00")
    assert item.lab_required is True


@pytest.mark.django_db
def test_dental_api_exposes_core_workflow(api_client):
    tenant = _tenant()
    patient = _patient(tenant)
    _authenticate_admin(tenant, api_client)

    procedure_response = api_client.post(
        "/api/v1/dental/procedure/",
        {
            "code": "PROT-001",
            "name": "Coroa cerâmica",
            "category": "PROSTHESIS",
            "base_price": "1200.00",
            "requires_prosthesis_lab": True,
        },
        format="json",
    )
    assert procedure_response.status_code == 201
    procedure_id = _response_data(procedure_response)["id"]

    appointment_response = api_client.post(
        "/api/v1/dental/appointment/",
        {
            "patient": patient.id,
            "scheduled_start": timezone.now().isoformat(),
            "reason": "Planeamento protético",
            "chair": "Gabinete 1",
        },
        format="json",
    )
    assert appointment_response.status_code == 201
    appointment_id = _response_data(appointment_response)["id"]

    record_response = api_client.post(
        "/api/v1/dental/record/",
        {
            "patient": patient.id,
            "appointment": appointment_id,
            "chief_complaint": "Fratura coronária",
            "diagnosis": "Necessidade de coroa",
        },
        format="json",
    )
    assert record_response.status_code == 201
    record_payload = _response_data(record_response)
    assert record_payload["patient_name"] == patient.name

    odontogram_response = api_client.post(
        "/api/v1/dental/odontogram/",
        {
            "record": record_payload["id"],
            "tooth_number": "21",
            "surface": "WHOLE",
            "condition": "CROWN",
            "procedure": procedure_id,
        },
        format="json",
    )
    assert odontogram_response.status_code == 201

    plan_response = api_client.post(
        "/api/v1/dental/treatment_plan/",
        {
            "patient": patient.id,
            "record": record_payload["id"],
            "title": "Reabilitação protética",
            "status": "APPROVED",
        },
        format="json",
    )
    assert plan_response.status_code == 201
    plan_id = _response_data(plan_response)["id"]

    item_response = api_client.post(
        "/api/v1/dental/treatment_item/",
        {
            "treatment_plan": plan_id,
            "procedure": procedure_id,
            "appointment": appointment_id,
            "tooth_number": "21",
            "surface": "WHOLE",
        },
        format="json",
    )
    assert item_response.status_code == 201
    item_payload = _response_data(item_response)
    assert item_payload["patient_name"] == patient.name
    assert item_payload["lab_required"] is True

    lab_order_response = api_client.post(
        "/api/v1/dental/prosthesis_lab_order/",
        {
            "patient": patient.id,
            "treatment_item": item_payload["id"],
            "order_number": "LAB-001",
            "prosthesis_type": "CROWN",
            "tooth_numbers": "21",
            "material": "Cerâmica",
            "cost": "650.00",
        },
        format="json",
    )
    assert lab_order_response.status_code == 201
    assert _response_data(lab_order_response)["patient_name"] == patient.name

    list_response = api_client.get("/api/v1/dental/treatment_item/")
    assert list_response.status_code == 200
    assert len(_items(list_response)) == 1
