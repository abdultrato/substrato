from __future__ import annotations

from datetime import timedelta
from uuid import uuid4

import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.clinical.models.patient import Patient
from apps.human_resources.models import Employee
from apps.physiotherapy.models import (
    FunctionalAssessment,
    PhysiotherapyDevice,
    RehabilitationProgressNote,
    RehabilitationSession,
    RehabilitationTreatmentPlan,
    TreatmentPlanIntervention,
)
from apps.physiotherapy.services import PhysiotherapyWorkflowService
from apps.tenants.models.tenant import Tenant


def _tenant():
    suffix = uuid4().hex[:8]
    return Tenant.objects.create(
        identifier=f"tn-{suffix}", name="Tenant Fisio", domain=f"{suffix}.local", active=True
    )


def _patient(tenant):
    return Patient.objects.create(tenant=tenant, name="Paciente Fisio", document_number=f"FS-{uuid4().hex[:6]}")


def _therapist(tenant):
    return Employee.objects.create(tenant=tenant, name="Fisioterapeuta", email=f"{uuid4().hex[:8]}@fisio.test")


def _device(tenant, *, status=PhysiotherapyDevice.Status.ACTIVE, next_maintenance=None):
    return PhysiotherapyDevice.objects.create(
        tenant=tenant,
        name="TENS",
        code=f"DEV-{uuid4().hex[:5]}",
        device_type=PhysiotherapyDevice.DeviceType.TENS,
        status=status,
        next_maintenance=next_maintenance,
    )


def _plan(tenant, patient, therapist, *, planned_sessions=2, draft=True):
    return RehabilitationTreatmentPlan.objects.create(
        tenant=tenant,
        name="Plano lombar",
        patient=patient,
        therapist=therapist,
        planned_sessions=planned_sessions,
        frequency_per_week=2,
    )


def _with_intervention(plan):
    TreatmentPlanIntervention.objects.create(
        tenant=plan.tenant,
        plan=plan,
        description="Cinesioterapia lombar",
        intervention_type=TreatmentPlanIntervention.InterventionType.EXERCISE,
    )
    return plan


def _active_plan(tenant, patient, therapist, *, planned_sessions=2):
    plan = _with_intervention(_plan(tenant, patient, therapist, planned_sessions=planned_sessions))
    PhysiotherapyWorkflowService.approve_plan(plan)
    return plan


@pytest.mark.django_db
def test_approve_plan_requires_interventions():
    tenant = _tenant()
    plan = _plan(tenant, _patient(tenant), _therapist(tenant))
    with pytest.raises(ValidationError):
        PhysiotherapyWorkflowService.approve_plan(plan)

    _with_intervention(plan)
    PhysiotherapyWorkflowService.approve_plan(plan)
    assert plan.status == RehabilitationTreatmentPlan.Status.ACTIVE


@pytest.mark.django_db
def test_session_journey_creates_progress_note_and_updates_plan():
    tenant = _tenant()
    patient = _patient(tenant)
    therapist = _therapist(tenant)
    plan = _active_plan(tenant, patient, therapist, planned_sessions=2)

    session = PhysiotherapyWorkflowService.schedule_session(plan)
    assert session.status == RehabilitationSession.Status.SCHEDULED

    PhysiotherapyWorkflowService.start_session(session, pain_before=8)
    assert session.status == RehabilitationSession.Status.IN_PROGRESS

    PhysiotherapyWorkflowService.finalize_session(
        session, pain_after=3, patient_response="Boa tolerância", mobility_score=7
    )
    session.refresh_from_db()
    plan.refresh_from_db()
    assert session.status == RehabilitationSession.Status.COMPLETED
    assert plan.completed_sessions == 1
    assert plan.progress_percent == pytest.approx(50.0)

    note = RehabilitationProgressNote.objects.filter(session=session).first()
    assert note is not None
    assert note.trend == RehabilitationProgressNote.Trend.IMPROVED


@pytest.mark.django_db
def test_schedule_session_respects_planned_limit():
    tenant = _tenant()
    patient = _patient(tenant)
    therapist = _therapist(tenant)
    plan = _active_plan(tenant, patient, therapist, planned_sessions=1)

    PhysiotherapyWorkflowService.schedule_session(plan)
    with pytest.raises(ValidationError):
        PhysiotherapyWorkflowService.schedule_session(plan)


@pytest.mark.django_db
def test_schedule_requires_active_plan():
    tenant = _tenant()
    patient = _patient(tenant)
    therapist = _therapist(tenant)
    plan = _plan(tenant, patient, therapist)  # DRAFT
    with pytest.raises(ValidationError):
        PhysiotherapyWorkflowService.schedule_session(plan)


@pytest.mark.django_db
def test_device_usage_blocks_unavailable_or_overdue_device():
    tenant = _tenant()
    patient = _patient(tenant)
    therapist = _therapist(tenant)
    plan = _active_plan(tenant, patient, therapist)
    session = PhysiotherapyWorkflowService.schedule_session(plan)
    PhysiotherapyWorkflowService.start_session(session)

    maintenance_device = _device(tenant, status=PhysiotherapyDevice.Status.MAINTENANCE)
    with pytest.raises(ValidationError):
        PhysiotherapyWorkflowService.register_device_usage(session, maintenance_device)

    overdue_device = _device(tenant, next_maintenance=timezone.localdate() - timedelta(days=1))
    with pytest.raises(ValidationError):
        PhysiotherapyWorkflowService.register_device_usage(session, overdue_device)

    ok_device = _device(tenant)
    usage = PhysiotherapyWorkflowService.register_device_usage(session, ok_device, duration_minutes=15)
    assert usage.pk is not None
    assert session.device_usages.count() == 1


@pytest.mark.django_db
def test_discharge_plan_completes_and_cancels_future_sessions():
    tenant = _tenant()
    patient = _patient(tenant)
    therapist = _therapist(tenant)
    plan = _active_plan(tenant, patient, therapist, planned_sessions=3)
    future = PhysiotherapyWorkflowService.schedule_session(plan)

    note = PhysiotherapyWorkflowService.discharge_plan(plan, summary="Objetivos atingidos", functional_score=9)
    plan.refresh_from_db()
    future.refresh_from_db()
    assert plan.status == RehabilitationTreatmentPlan.Status.COMPLETED
    assert future.status == RehabilitationSession.Status.CANCELLED
    assert note.summary.startswith("[ALTA]")


@pytest.mark.django_db
def test_pause_and_resume_plan():
    tenant = _tenant()
    plan = _active_plan(tenant, _patient(tenant), _therapist(tenant))
    PhysiotherapyWorkflowService.pause_plan(plan, reason="Paciente com gripe")
    assert plan.status == RehabilitationTreatmentPlan.Status.PAUSED
    PhysiotherapyWorkflowService.resume_plan(plan)
    assert plan.status == RehabilitationTreatmentPlan.Status.ACTIVE


@pytest.mark.django_db
def test_finalize_assessment_requires_therapist():
    tenant = _tenant()
    patient = _patient(tenant)
    assessment = FunctionalAssessment.objects.create(tenant=tenant, patient=patient)
    with pytest.raises(ValidationError):
        PhysiotherapyWorkflowService.finalize_assessment(assessment)

    assessment.therapist = _therapist(tenant)
    assessment.save()
    PhysiotherapyWorkflowService.finalize_assessment(assessment)
    assert assessment.status == FunctionalAssessment.Status.FINALIZED


@pytest.mark.django_db
def test_finalize_session_requires_in_progress():
    tenant = _tenant()
    patient = _patient(tenant)
    therapist = _therapist(tenant)
    plan = _active_plan(tenant, patient, therapist)
    session = PhysiotherapyWorkflowService.schedule_session(plan)  # SCHEDULED
    with pytest.raises(ValidationError):
        PhysiotherapyWorkflowService.finalize_session(session, pain_after=2)
