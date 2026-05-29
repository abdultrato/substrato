from datetime import timedelta
from decimal import Decimal
import json

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError
from django.utils import timezone
import pytest

from apps.clinical.models.patient import Patient
from apps.medical_records.models.medical_record_entry import MedicalRecordEntry
from apps.medical_records.models.prescription_item import PrescriptionItem
from apps.pharmacy.models.product import Product
from apps.physiotherapy.models import (
    FunctionalAssessment,
    PhysiotherapyDevice,
    RehabilitationDeviceUsage,
    RehabilitationProgressNote,
    RehabilitationSession,
    RehabilitationTreatmentPlan,
    TreatmentPlanIntervention,
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
        identifier="tn-physio",
        name="Tenant Fisio",
        domain="tenant-physio.local",
        active=True,
    )


def _patient(tenant, name="Paciente Fisio"):
    return Patient.objects.create(
        tenant=tenant,
        name=name,
        gender="Masculino",
        address_street="Rua Reabilitação",
    )


def _prescription_item(tenant, patient):
    record = MedicalRecordEntry.objects.create(
        tenant=tenant,
        patient=patient,
        symptoms="Dor lombar",
        diagnosis="Lombalgia",
        prescription="Fisioterapia motora",
    )
    product = Product.objects.create(
        tenant=tenant,
        name="Fisioterapia motora",
        type=Product.ProductType.MEDICAMENTO,
    )
    return PrescriptionItem.objects.create(
        record=record,
        medication=product,
        dosage_value=Decimal("1.00"),
        dosage_unit="MG",
        dose_count=1,
        notes="Encaminhar para reabilitação",
    )


def _authenticate_admin(tenant, api_client):
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username="admin-physio",
        email="admin-physio@example.com",
        password="testpass123",
        tenant=tenant,
    )
    group, _ = Group.objects.get_or_create(name="Administrador")
    user.groups.add(group)
    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=user)
    return user


@pytest.mark.django_db
def test_physiotherapy_models_propagate_tenant_and_update_plan_progress():
    tenant = _tenant()
    patient = _patient(tenant)
    prescription_item = _prescription_item(tenant, patient)
    device = PhysiotherapyDevice.objects.create(
        tenant=tenant,
        code="TENS-01",
        name="TENS Sala 1",
        device_type="TENS",
    )
    assessment = FunctionalAssessment.objects.create(
        patient=patient,
        medical_record=prescription_item.record,
        body_region="LUMBAR",
        pain_score=7,
        mobility_score=4,
        functional_diagnosis="Limitação lombar",
    )
    plan = RehabilitationTreatmentPlan.objects.create(
        patient=patient,
        assessment=assessment,
        medical_record=prescription_item.record,
        prescription_item=prescription_item,
        name="Reabilitação lombar",
        planned_sessions=4,
        frequency_per_week=2,
        objectives="Reduzir dor e melhorar mobilidade",
    )
    intervention = TreatmentPlanIntervention.objects.create(
        plan=plan,
        device=device,
        intervention_type="ELECTROTHERAPY",
        body_region="LUMBAR",
        description="TENS lombar",
        duration_minutes=20,
    )
    session = RehabilitationSession.objects.create(
        plan=plan,
        status="COMPLETED",
        scheduled_at=timezone.now(),
        pain_before=7,
        pain_after=5,
        interventions_performed="TENS e mobilização",
    )
    progress = RehabilitationProgressNote.objects.create(
        plan=plan,
        session=session,
        trend="IMPROVED",
        functional_score=5,
        pain_score=5,
        progress_percent=Decimal("25.00"),
        summary="Paciente tolerou bem a sessão.",
    )
    usage = RehabilitationDeviceUsage.objects.create(
        session=session,
        device=device,
        duration_minutes=20,
        settings="80 Hz",
    )

    plan.refresh_from_db()
    assert assessment.tenant == tenant
    assert plan.tenant == tenant
    assert intervention.tenant == tenant
    assert session.tenant == tenant
    assert progress.tenant == tenant
    assert usage.tenant == tenant
    assert session.patient == patient
    assert plan.completed_sessions == 1
    assert plan.progress_percent == Decimal("25.00")

    other_patient = _patient(tenant, name="Outro Paciente")
    with pytest.raises(ValidationError):
        RehabilitationTreatmentPlan.objects.create(
            patient=other_patient,
            prescription_item=prescription_item,
            name="Plano inválido",
        )


@pytest.mark.django_db
def test_physiotherapy_api_exposes_rehabilitation_workflow(api_client):
    tenant = _tenant()
    patient = _patient(tenant)
    prescription_item = _prescription_item(tenant, patient)
    _authenticate_admin(tenant, api_client)

    device_response = api_client.post(
        "/api/v1/physiotherapy/device/",
        {
            "code": "BIKE-01",
            "name": "Bicicleta ergométrica",
            "device_type": "EXERCISE",
            "location": "Sala Fisio",
            "next_maintenance": (timezone.localdate() + timedelta(days=90)).isoformat(),
        },
        format="json",
    )
    assert device_response.status_code == 201
    device_id = _response_data(device_response)["id"]

    assessment_response = api_client.post(
        "/api/v1/physiotherapy/assessment/",
        {
            "patient": patient.id,
            "medical_record": prescription_item.record_id,
            "status": "ACTIVE",
            "body_region": "KNEE",
            "pain_score": 6,
            "mobility_score": 5,
            "strength_score": 4,
            "functional_diagnosis": "Défice funcional do joelho",
            "goals": "Retorno gradual à marcha",
        },
        format="json",
    )
    assert assessment_response.status_code == 201
    assessment_payload = _response_data(assessment_response)
    assert assessment_payload["patient_name"] == patient.name

    plan_response = api_client.post(
        "/api/v1/physiotherapy/treatment_plan/",
        {
            "patient": patient.id,
            "assessment": assessment_payload["id"],
            "medical_record": prescription_item.record_id,
            "prescription_item": prescription_item.id,
            "name": "Reabilitação do joelho",
            "status": "ACTIVE",
            "body_region": "KNEE",
            "frequency_per_week": 3,
            "planned_sessions": 6,
            "objectives": "Melhorar força e amplitude",
        },
        format="json",
    )
    assert plan_response.status_code == 201
    plan_id = _response_data(plan_response)["id"]

    intervention_response = api_client.post(
        "/api/v1/physiotherapy/intervention/",
        {
            "plan": plan_id,
            "device": device_id,
            "intervention_type": "EXERCISE",
            "body_region": "KNEE",
            "description": "Bicicleta com baixa resistência",
            "duration_minutes": 15,
            "sets": 1,
        },
        format="json",
    )
    assert intervention_response.status_code == 201

    session_response = api_client.post(
        "/api/v1/physiotherapy/session/",
        {
            "plan": plan_id,
            "status": "COMPLETED",
            "scheduled_at": timezone.now().isoformat(),
            "duration_minutes": 45,
            "pain_before": 6,
            "pain_after": 4,
            "mobility_score": 6,
            "interventions_performed": "Bicicleta e treino de marcha",
        },
        format="json",
    )
    assert session_response.status_code == 201
    session_payload = _response_data(session_response)
    assert session_payload["patient_name"] == patient.name

    progress_response = api_client.post(
        "/api/v1/physiotherapy/progress_note/",
        {
            "plan": plan_id,
            "session": session_payload["id"],
            "trend": "IMPROVED",
            "functional_score": 6,
            "pain_score": 4,
            "progress_percent": "16.67",
            "summary": "Melhoria da tolerância ao exercício.",
        },
        format="json",
    )
    assert progress_response.status_code == 201

    usage_response = api_client.post(
        "/api/v1/physiotherapy/device_usage/",
        {
            "session": session_payload["id"],
            "device": device_id,
            "duration_minutes": 15,
            "settings": "Resistência 2",
            "outcome": "Sem intercorrências",
        },
        format="json",
    )
    assert usage_response.status_code == 201

    list_response = api_client.get("/api/v1/physiotherapy/treatment_plan/")
    assert list_response.status_code == 200
    assert len(_items(list_response)) == 1
