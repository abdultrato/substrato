from datetime import timedelta
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
    DentalPatientTreatmentPlan,
    DentalProcedure,
    DentalRecord,
    DentalTreatmentPlan,
    DentalTreatmentPlanItem,
)
from apps.human_resources.models.employee import Employee
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


def _dentist(tenant):
    return Employee.objects.create(
        tenant=tenant,
        name="Dra. Marta Dental",
        email="marta.dental@example.com",
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
    plan = DentalTreatmentPlan.objects.create(tenant=tenant, title="Tratamento inicial")
    patient_plan = DentalPatientTreatmentPlan.objects.create(
        patient=patient,
        treatment_plan=plan,
        record=record,
        valid_from=timezone.localdate(),
    )
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
    assert patient_plan.tenant == tenant
    assert patient_plan.is_valid is True
    assert item.tenant == tenant
    assert item.unit_price == Decimal("150.00")
    assert item.lab_required is True


@pytest.mark.django_db
def test_dental_record_generates_history_from_previous_records_and_treatments():
    tenant = _tenant()
    patient = _patient(tenant)
    dentist = _dentist(tenant)
    procedure = DentalProcedure.objects.create(
        tenant=tenant,
        name="Restauração",
        base_price=Decimal("200.00"),
    )
    now = timezone.now()
    previous_appointment = DentalAppointment.objects.create(
        patient=patient,
        dentist=dentist,
        scheduled_start=now - timedelta(days=20),
        scheduled_end=now - timedelta(days=20, hours=-1),
        status=DentalAppointment.Status.COMPLETED,
        reason="Dor no dente 11",
    )
    previous_record = DentalRecord.objects.create(
        patient=patient,
        dentist=dentist,
        appointment=previous_appointment,
        opened_at=now - timedelta(days=19),
        closed_at=now - timedelta(days=19, hours=-1),
        status=DentalRecord.Status.FINALIZED,
        chief_complaint="Dor ao mastigar",
        dental_history="Limpeza semestral regular.",
        diagnosis="Cárie no dente 11.",
        treatment_summary="Restauração indicada.",
        notes="Sem alergias relatadas.",
    )
    plan = DentalTreatmentPlan.objects.create(
        tenant=tenant,
        dentist=dentist,
        title="Plano restaurador",
        status=DentalTreatmentPlan.Status.COMPLETED,
        objectives="Resolver cárie no 11.",
        planned_start=(now - timedelta(days=18)).date(),
        planned_end=(now - timedelta(days=17)).date(),
    )
    DentalPatientTreatmentPlan.objects.create(
        patient=patient,
        treatment_plan=plan,
        dentist=dentist,
        record=previous_record,
        valid_from=(now - timedelta(days=18)).date(),
        valid_until=(now + timedelta(days=10)).date(),
    )
    DentalTreatmentPlanItem.objects.create(
        treatment_plan=plan,
        procedure=procedure,
        appointment=previous_appointment,
        tooth_number="11",
        surface="O",
        status=DentalTreatmentPlanItem.Status.COMPLETED,
        completed_at=now - timedelta(days=17),
        clinical_notes="Restauração concluída sem intercorrências.",
    )

    current_record = DentalRecord.objects.create(
        patient=patient,
        dentist=dentist,
        opened_at=now,
        chief_complaint="Consulta de retorno",
    )

    assert "Histórico gerado automaticamente" in current_record.dental_history
    assert "Dentista: Dra. Marta Dental" in current_record.dental_history
    assert "Consulta dentária:" in current_record.dental_history
    assert "Queixa principal: Dor ao mastigar" in current_record.dental_history
    assert "Histórico dentário: Limpeza semestral regular." in current_record.dental_history
    assert "Diagnóstico dentário: Cárie no dente 11." in current_record.dental_history
    assert "Resumo do tratamento: Restauração indicada." in current_record.dental_history
    assert "Plano: Plano restaurador" in current_record.dental_history
    assert "Notas clínicas: Restauração concluída sem intercorrências." in current_record.dental_history

    current_record.dental_history = "Histórico manual preservado."
    current_record.save()
    current_record.refresh_from_db()
    assert current_record.dental_history == "Histórico manual preservado."


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
            "title": "Reabilitação protética",
            "status": "APPROVED",
        },
        format="json",
    )
    assert plan_response.status_code == 201
    plan_id = _response_data(plan_response)["id"]

    patient_plan_response = api_client.post(
        "/api/v1/dental/patient_treatment_plan/",
        {
            "patient": patient.id,
            "treatment_plan": plan_id,
            "record": record_payload["id"],
            "valid_from": timezone.localdate().isoformat(),
            "valid_until": (timezone.localdate() + timedelta(days=30)).isoformat(),
        },
        format="json",
    )
    assert patient_plan_response.status_code == 201
    patient_plan_payload = _response_data(patient_plan_response)
    assert patient_plan_payload["patient_name"] == patient.name
    assert patient_plan_payload["treatment_plan_title"] == "Reabilitação protética"
    assert patient_plan_payload["is_valid"] is True

    expired_patient = Patient.objects.create(
        tenant=tenant,
        name="Paciente Plano Expirado",
        gender="Feminino",
        address_street="Rua Expirada",
    )
    expired_plan_response = api_client.post(
        "/api/v1/dental/patient_treatment_plan/",
        {
            "patient": expired_patient.id,
            "treatment_plan": plan_id,
            "valid_from": (timezone.localdate() - timedelta(days=60)).isoformat(),
            "valid_until": (timezone.localdate() - timedelta(days=1)).isoformat(),
        },
        format="json",
    )
    assert expired_plan_response.status_code == 201
    assert _response_data(expired_plan_response)["is_expired"] is True

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
    assert "patient_name" not in item_payload
    assert item_payload["treatment_plan_title"] == "Reabilitação protética"
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

    valid_patients_response = api_client.get("/api/v1/dental/patient_treatment_plan/valid/")
    assert valid_patients_response.status_code == 200
    valid_items = _items(valid_patients_response)
    assert [item["patient_name"] for item in valid_items] == [patient.name]

    expired_patients_response = api_client.get("/api/v1/dental/patient_treatment_plan/expired/")
    assert expired_patients_response.status_code == 200
    expired_items = _items(expired_patients_response)
    assert [item["patient_name"] for item in expired_items] == [expired_patient.name]
