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
from apps.tenants.models.tenant import Tenant
from apps.therapy.models import (
    TherapeuticResource,
    TherapyEvaluation,
    TherapyPlanGoal,
    TherapyPrescriptionLink,
    TherapyProgressNote,
    TherapySession,
    TherapyTreatmentPlan,
)


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
        identifier="tn-therapy",
        name="Tenant Terapias",
        domain="tenant-therapy.local",
        active=True,
    )


def _patient(tenant, name="Paciente Terapias"):
    return Patient.objects.create(
        tenant=tenant,
        name=name,
        gender="Feminino",
        address_street="Rua Terapias",
    )


def _prescription_item(tenant, patient, name="Terapia ocupacional"):
    record = MedicalRecordEntry.objects.create(
        tenant=tenant,
        patient=patient,
        symptoms="Défice funcional",
        diagnosis="Necessita reabilitação especializada",
        prescription=name,
    )
    product = Product.objects.create(
        tenant=tenant,
        name=name,
        type=Product.ProductType.MEDICAMENTO,
    )
    return PrescriptionItem.objects.create(
        record=record,
        medication=product,
        dosage_value=Decimal("1.00"),
        dosage_unit="MG",
        dose_count=1,
        notes="Encaminhar para terapia",
    )


def _authenticate_admin(tenant, api_client):
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username="admin-therapy",
        email="admin-therapy@example.com",
        password="testpass123",
        tenant=tenant,
    )
    group, _ = Group.objects.get_or_create(name="Administrador")
    user.groups.add(group)
    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=user)
    return user


@pytest.mark.django_db
def test_therapy_models_track_specialized_plan_and_prescription_link():
    tenant = _tenant()
    patient = _patient(tenant)
    prescription_item = _prescription_item(tenant, patient)
    resource = TherapeuticResource.objects.create(
        tenant=tenant,
        code="ADL-01",
        name="Kit de AVD",
        discipline="OCCUPATIONAL_THERAPY",
        resource_type="ASSISTIVE_TECHNOLOGY",
    )
    evaluation = TherapyEvaluation.objects.create(
        patient=patient,
        medical_record=prescription_item.record,
        prescription_item=prescription_item,
        discipline="OCCUPATIONAL_THERAPY",
        status="ACTIVE",
        referral_reason="Treino de atividades da vida diária",
        motor_score=4,
        activities_daily_living_score=3,
    )
    plan = TherapyTreatmentPlan.objects.create(
        patient=patient,
        evaluation=evaluation,
        medical_record=prescription_item.record,
        prescription_item=prescription_item,
        name="Plano de autonomia funcional",
        discipline="OCCUPATIONAL_THERAPY",
        status="ACTIVE",
        planned_sessions=2,
        objectives="Ganhar autonomia nas AVD",
    )
    goal = TherapyPlanGoal.objects.create(
        plan=plan,
        domain="ACTIVITIES_DAILY_LIVING",
        description="Vestir-se com supervisão mínima",
        baseline_score=3,
        target_score=7,
        current_score=4,
    )
    session = TherapySession.objects.create(
        plan=plan,
        status="COMPLETED",
        scheduled_at=timezone.now(),
        functional_score=5,
        interventions_performed="Treino de vestir e higiene pessoal",
    )
    progress = TherapyProgressNote.objects.create(
        plan=plan,
        session=session,
        domain="ACTIVITIES_DAILY_LIVING",
        trend="IMPROVED",
        functional_score=5,
        progress_percent=Decimal("50.00"),
        summary="Melhoria na sequência das tarefas.",
    )
    link = TherapyPrescriptionLink.objects.create(
        patient=patient,
        prescription_item=prescription_item,
        plan=plan,
        discipline="OCCUPATIONAL_THERAPY",
        requested_service="Terapia ocupacional",
        requested_sessions=2,
    )

    plan.refresh_from_db()
    assert resource.tenant == tenant
    assert evaluation.tenant == tenant
    assert plan.tenant == tenant
    assert goal.tenant == tenant
    assert goal.discipline == "OCCUPATIONAL_THERAPY"
    assert session.tenant == tenant
    assert session.patient == patient
    assert session.discipline == "OCCUPATIONAL_THERAPY"
    assert progress.tenant == tenant
    assert progress.discipline == "OCCUPATIONAL_THERAPY"
    assert link.tenant == tenant
    assert link.status == "LINKED"
    assert plan.completed_sessions == 1
    assert plan.progress_percent == Decimal("50.00")

    other_patient = _patient(tenant, name="Outro Paciente")
    with pytest.raises(ValidationError):
        TherapyTreatmentPlan.objects.create(
            patient=other_patient,
            prescription_item=prescription_item,
            name="Plano inválido",
        )

    with pytest.raises(ValidationError):
        TherapyTreatmentPlan.objects.create(
            patient=patient,
            evaluation=evaluation,
            name="Plano com disciplina inválida",
            discipline="SPEECH_THERAPY",
        )


@pytest.mark.django_db
def test_therapy_api_exposes_occupational_and_specialized_physiotherapy_workflow(api_client):
    tenant = _tenant()
    patient = _patient(tenant)
    prescription_item = _prescription_item(tenant, patient, name="Fisioterapia especializada")
    _authenticate_admin(tenant, api_client)

    resource_response = api_client.post(
        "/api/v1/therapy/resource/",
        {
            "code": "MOTOR-01",
            "name": "Plataforma de treino motor",
            "discipline": "SPECIALIZED_PHYSIOTHERAPY",
            "resource_type": "DEVICE",
            "location": "Sala de terapia",
        },
        format="json",
    )
    assert resource_response.status_code == 201

    evaluation_response = api_client.post(
        "/api/v1/therapy/evaluation/",
        {
            "patient": patient.id,
            "medical_record": prescription_item.record_id,
            "prescription_item": prescription_item.id,
            "discipline": "SPECIALIZED_PHYSIOTHERAPY",
            "status": "ACTIVE",
            "referral_reason": "Reabilitação motora pós-lesão",
            "motor_score": 4,
            "coordination_score": 3,
            "goals": "Melhorar marcha e equilíbrio",
        },
        format="json",
    )
    assert evaluation_response.status_code == 201
    evaluation_payload = _response_data(evaluation_response)
    assert evaluation_payload["patient_name"] == patient.name

    plan_response = api_client.post(
        "/api/v1/therapy/treatment_plan/",
        {
            "patient": patient.id,
            "evaluation": evaluation_payload["id"],
            "medical_record": prescription_item.record_id,
            "prescription_item": prescription_item.id,
            "name": "Plano motor especializado",
            "status": "ACTIVE",
            "planned_sessions": 4,
            "frequency_per_week": 2,
            "objectives": "Melhorar controlo motor",
        },
        format="json",
    )
    assert plan_response.status_code == 201
    plan_payload = _response_data(plan_response)
    assert plan_payload["discipline"] == "SPECIALIZED_PHYSIOTHERAPY"
    plan_id = plan_payload["id"]

    goal_response = api_client.post(
        "/api/v1/therapy/goal/",
        {
            "plan": plan_id,
            "domain": "MOTOR",
            "description": "Marcha independente em superfície plana",
            "baseline_score": 4,
            "target_score": 8,
        },
        format="json",
    )
    assert goal_response.status_code == 201
    assert _response_data(goal_response)["discipline"] == "SPECIALIZED_PHYSIOTHERAPY"

    session_response = api_client.post(
        "/api/v1/therapy/session/",
        {
            "plan": plan_id,
            "status": "COMPLETED",
            "scheduled_at": timezone.now().isoformat(),
            "duration_minutes": 50,
            "motor_score": 5,
            "functional_score": 5,
            "interventions_performed": "Treino de marcha e equilíbrio",
        },
        format="json",
    )
    assert session_response.status_code == 201
    session_payload = _response_data(session_response)
    assert session_payload["patient_name"] == patient.name
    assert session_payload["discipline"] == "SPECIALIZED_PHYSIOTHERAPY"

    progress_response = api_client.post(
        "/api/v1/therapy/progress_note/",
        {
            "plan": plan_id,
            "session": session_payload["id"],
            "domain": "MOTOR",
            "trend": "IMPROVED",
            "functional_score": 5,
            "motor_score": 5,
            "progress_percent": "25.00",
            "summary": "Melhor controlo postural.",
        },
        format="json",
    )
    assert progress_response.status_code == 201

    link_response = api_client.post(
        "/api/v1/therapy/prescription_link/",
        {
            "patient": patient.id,
            "prescription_item": prescription_item.id,
            "plan": plan_id,
            "discipline": "SPECIALIZED_PHYSIOTHERAPY",
            "requested_service": "Fisioterapia especializada",
            "requested_sessions": 4,
        },
        format="json",
    )
    assert link_response.status_code == 201
    assert _response_data(link_response)["status"] == "LINKED"

    list_response = api_client.get("/api/v1/therapy/treatment_plan/?discipline=SPECIALIZED_PHYSIOTHERAPY")
    assert list_response.status_code == 200
    assert len(_items(list_response)) == 1
