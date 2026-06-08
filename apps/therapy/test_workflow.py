from __future__ import annotations

from uuid import uuid4

import pytest
from django.core.exceptions import ValidationError

from apps.clinical.models.patient import Patient
from apps.human_resources.models import Employee
from apps.tenants.models.tenant import Tenant
from apps.therapy.models import (
    TherapyEvaluation,
    TherapyPlanGoal,
    TherapyProgressNote,
    TherapySession,
    TherapyTreatmentPlan,
)
from apps.therapy.services import TherapyWorkflowService


def _tenant():
    suffix = uuid4().hex[:8]
    return Tenant.objects.create(
        identifier=f"tn-ter-{suffix}", name="Tenant Ter", domain=f"{suffix}.local", active=True
    )


def _patient(tenant):
    return Patient.objects.create(tenant=tenant, name="Paciente Ter", document_number=f"TR-{uuid4().hex[:6]}")


def _therapist(tenant):
    return Employee.objects.create(tenant=tenant, name="Terapeuta", email=f"{uuid4().hex[:8]}@ter.test")


def _plan(tenant, patient, therapist, *, planned_sessions=2):
    return TherapyTreatmentPlan.objects.create(
        tenant=tenant,
        name="PTI Motricidade",
        patient=patient,
        therapist=therapist,
        objectives="Melhorar autonomia na alimentação",
        planned_sessions=planned_sessions,
        frequency_per_week=2,
    )


def _goal(plan):
    return TherapyPlanGoal.objects.create(
        tenant=plan.tenant, plan=plan, description="Preensão de colher com mínima assistência",
        baseline_score=2, target_score=8,
    )


def _active_plan(tenant, patient, therapist, *, planned_sessions=2):
    plan = _plan(tenant, patient, therapist, planned_sessions=planned_sessions)
    _goal(plan)
    TherapyWorkflowService.approve_plan(plan)
    return plan


@pytest.mark.django_db
def test_approve_plan_requires_general_objective_and_goal():
    tenant = _tenant()
    patient = _patient(tenant)
    therapist = _therapist(tenant)

    plan_no_obj = TherapyTreatmentPlan.objects.create(tenant=tenant, name="X", patient=patient, therapist=therapist)
    with pytest.raises(ValidationError):
        TherapyWorkflowService.approve_plan(plan_no_obj)  # sem objetivo geral

    plan = _plan(tenant, patient, therapist)
    with pytest.raises(ValidationError):
        TherapyWorkflowService.approve_plan(plan)  # sem objetivo terapêutico

    _goal(plan)
    TherapyWorkflowService.approve_plan(plan)
    assert plan.status == TherapyTreatmentPlan.Status.ACTIVE


@pytest.mark.django_db
def test_session_journey_creates_progress_note_and_progress():
    tenant = _tenant()
    patient = _patient(tenant)
    therapist = _therapist(tenant)
    plan = _active_plan(tenant, patient, therapist, planned_sessions=2)

    session = TherapyWorkflowService.schedule_session(plan)
    TherapyWorkflowService.start_session(session)
    TherapyWorkflowService.finalize_session(session, functional_score=7, patient_response="Colaborativo")
    session.refresh_from_db()
    plan.refresh_from_db()
    assert session.status == TherapySession.Status.COMPLETED
    assert plan.completed_sessions == 1
    assert plan.progress_percent == pytest.approx(50.0)
    assert TherapyProgressNote.objects.filter(session=session).exists()


@pytest.mark.django_db
def test_plan_auto_completes_when_all_sessions_done():
    tenant = _tenant()
    patient = _patient(tenant)
    therapist = _therapist(tenant)
    plan = _active_plan(tenant, patient, therapist, planned_sessions=1)
    session = TherapyWorkflowService.schedule_session(plan)
    TherapyWorkflowService.start_session(session)
    TherapyWorkflowService.finalize_session(session, functional_score=9)
    plan.refresh_from_db()
    # register_session_completion() auto-conclui o plano a 100%.
    assert plan.status == TherapyTreatmentPlan.Status.COMPLETED


@pytest.mark.django_db
def test_schedule_session_respects_planned_limit():
    tenant = _tenant()
    plan = _active_plan(tenant, _patient(tenant), _therapist(tenant), planned_sessions=1)
    TherapyWorkflowService.schedule_session(plan)
    with pytest.raises(ValidationError):
        TherapyWorkflowService.schedule_session(plan)


@pytest.mark.django_db
def test_goal_progress_and_achievement():
    tenant = _tenant()
    plan = _active_plan(tenant, _patient(tenant), _therapist(tenant))
    goal = plan.goals.first()
    TherapyWorkflowService.update_goal_progress(goal, current_score=5)
    assert goal.status == TherapyPlanGoal.Status.IN_PROGRESS
    assert goal.current_score == 5
    TherapyWorkflowService.mark_goal_achieved(goal)
    assert goal.status == TherapyPlanGoal.Status.ACHIEVED
    assert goal.current_score == goal.target_score


@pytest.mark.django_db
def test_discharge_completes_plan_and_cancels_future_sessions():
    tenant = _tenant()
    plan = _active_plan(tenant, _patient(tenant), _therapist(tenant), planned_sessions=3)
    future = TherapyWorkflowService.schedule_session(plan)
    note = TherapyWorkflowService.discharge_plan(plan, summary="Objetivos atingidos", functional_score=9)
    plan.refresh_from_db()
    future.refresh_from_db()
    assert plan.status == TherapyTreatmentPlan.Status.COMPLETED
    assert future.status == TherapySession.Status.CANCELLED
    assert note.summary.startswith("[ALTA]")


@pytest.mark.django_db
def test_finalize_evaluation_requires_therapist():
    tenant = _tenant()
    patient = _patient(tenant)
    evaluation = TherapyEvaluation.objects.create(tenant=tenant, patient=patient)
    with pytest.raises(ValidationError):
        TherapyWorkflowService.finalize_evaluation(evaluation)
    evaluation.therapist = _therapist(tenant)
    evaluation.save()
    TherapyWorkflowService.finalize_evaluation(evaluation)
    assert evaluation.status == TherapyEvaluation.Status.FINALIZED
