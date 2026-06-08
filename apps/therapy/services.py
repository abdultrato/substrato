from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.therapy.models import (
    TherapeuticResource,
    TherapyEvaluation,
    TherapyPlanGoal,
    TherapyPrescriptionLink,
    TherapyProgressNote,
    TherapySession,
    TherapyTreatmentPlan,
)


def _append(current: str, label: str, text: str) -> str:
    if not text:
        return current
    return f"{current}\n[{label}] {text}".strip()


class TherapyWorkflowService:
    """Casos de uso da jornada terapêutica (§6.13): avaliar → planear → objetivos → sessões → evolução → alta."""

    # ------------------------------------------------------------------ #
    # Recursos terapêuticos
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def activate_resource(resource: TherapeuticResource) -> TherapeuticResource:
        resource.status = TherapeuticResource.Status.ACTIVE
        resource.save()
        return resource

    @staticmethod
    @transaction.atomic
    def deactivate_resource(resource: TherapeuticResource) -> TherapeuticResource:
        resource.status = TherapeuticResource.Status.INACTIVE
        resource.save()
        return resource

    @staticmethod
    @transaction.atomic
    def mark_resource_maintenance(
        resource: TherapeuticResource, *, next_review=None, notes: str = ""
    ) -> TherapeuticResource:
        resource.status = TherapeuticResource.Status.MAINTENANCE
        if next_review is not None:
            resource.next_review = next_review
        resource.notes = _append(resource.notes, "Manutenção", notes)
        resource.save()
        return resource

    # ------------------------------------------------------------------ #
    # Avaliação
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def finalize_evaluation(evaluation: TherapyEvaluation) -> TherapyEvaluation:
        if evaluation.status == TherapyEvaluation.Status.CANCELLED:
            raise ValidationError("Avaliação cancelada não pode ser finalizada.")
        if evaluation.therapist_id is None:
            raise ValidationError({"therapist": "A avaliação precisa de terapeuta responsável."})
        if evaluation.status != TherapyEvaluation.Status.FINALIZED:
            evaluation.status = TherapyEvaluation.Status.FINALIZED
            evaluation.save()
        return evaluation

    @staticmethod
    @transaction.atomic
    def cancel_evaluation(evaluation: TherapyEvaluation, *, reason: str = "") -> TherapyEvaluation:
        if evaluation.status == TherapyEvaluation.Status.FINALIZED:
            raise ValidationError("Avaliação finalizada não pode ser cancelada (use retificação).")
        evaluation.status = TherapyEvaluation.Status.CANCELLED
        evaluation.notes = _append(evaluation.notes, "Cancelamento", reason)
        evaluation.save()
        return evaluation

    # ------------------------------------------------------------------ #
    # Plano terapêutico individualizado (PTI)
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def approve_plan(plan: TherapyTreatmentPlan) -> TherapyTreatmentPlan:
        """Aprova/ativa o PTI. Exige objetivo geral e ao menos um objetivo terapêutico (§6.7)."""
        if plan.status != TherapyTreatmentPlan.Status.DRAFT:
            raise ValidationError("Apenas planos em rascunho podem ser aprovados.")
        if not (plan.objectives or "").strip():
            raise ValidationError({"objectives": "Defina o objetivo geral do plano."})
        if not plan.goals.exists():
            raise ValidationError("O plano precisa de pelo menos um objetivo terapêutico antes de ser aprovado.")
        plan.status = TherapyTreatmentPlan.Status.ACTIVE
        plan.save()
        return plan

    @staticmethod
    @transaction.atomic
    def pause_plan(plan: TherapyTreatmentPlan, *, reason: str = "") -> TherapyTreatmentPlan:
        if plan.status != TherapyTreatmentPlan.Status.ACTIVE:
            raise ValidationError("Apenas planos ativos podem ser suspensos.")
        if not reason.strip():
            raise ValidationError({"reason": "Informe o motivo da suspensão."})
        plan.status = TherapyTreatmentPlan.Status.PAUSED
        plan.notes = _append(plan.notes, "Suspensão", reason)
        plan.save()
        return plan

    @staticmethod
    @transaction.atomic
    def resume_plan(plan: TherapyTreatmentPlan) -> TherapyTreatmentPlan:
        if plan.status != TherapyTreatmentPlan.Status.PAUSED:
            raise ValidationError("Apenas planos pausados podem ser retomados.")
        plan.status = TherapyTreatmentPlan.Status.ACTIVE
        plan.save()
        return plan

    @staticmethod
    @transaction.atomic
    def cancel_plan(plan: TherapyTreatmentPlan, *, reason: str = "") -> TherapyTreatmentPlan:
        if plan.status == TherapyTreatmentPlan.Status.COMPLETED:
            raise ValidationError("Um plano concluído não pode ser cancelado.")
        if not reason.strip():
            raise ValidationError({"reason": "Informe o motivo do cancelamento."})
        plan.status = TherapyTreatmentPlan.Status.CANCELLED
        plan.notes = _append(plan.notes, "Cancelamento", reason)
        plan.save()
        return plan

    @staticmethod
    @transaction.atomic
    def discharge_plan(
        plan: TherapyTreatmentPlan,
        *,
        summary: str,
        trend: str = TherapyProgressNote.Trend.IMPROVED,
        functional_score: int = 0,
        recommendations: str = "",
    ) -> TherapyProgressNote:
        """Alta terapêutica: evolução final + conclusão do plano + cancelamento de sessões futuras (§6.13)."""
        if plan.status not in {TherapyTreatmentPlan.Status.ACTIVE, TherapyTreatmentPlan.Status.PAUSED}:
            raise ValidationError("Só é possível dar alta a planos ativos ou pausados.")
        if not summary.strip():
            raise ValidationError({"summary": "Descreva a evolução de alta."})

        note = TherapyProgressNote.objects.create(
            tenant=plan.tenant,
            plan=plan,
            discipline=plan.discipline,
            trend=trend,
            functional_score=functional_score,
            progress_percent=plan.progress_percent,
            summary=f"[ALTA] {summary}",
            recommendations=recommendations,
        )
        for session in plan.sessions.filter(status=TherapySession.Status.SCHEDULED):
            session.status = TherapySession.Status.CANCELLED
            session.notes = _append(session.notes, "Alta", "Sessão cancelada por alta do plano.")
            session.save()
        plan.status = TherapyTreatmentPlan.Status.COMPLETED
        plan.save()
        return note

    # ------------------------------------------------------------------ #
    # Objetivos terapêuticos
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def update_goal_progress(goal: TherapyPlanGoal, *, current_score: int) -> TherapyPlanGoal:
        if goal.status in {TherapyPlanGoal.Status.ACHIEVED, TherapyPlanGoal.Status.CANCELLED}:
            raise ValidationError("Objetivo encerrado não pode ser atualizado.")
        goal.current_score = current_score
        if goal.status == TherapyPlanGoal.Status.OPEN:
            goal.status = TherapyPlanGoal.Status.IN_PROGRESS
        goal.save()
        return goal

    @staticmethod
    @transaction.atomic
    def mark_goal_achieved(goal: TherapyPlanGoal, *, current_score: int | None = None) -> TherapyPlanGoal:
        if goal.status == TherapyPlanGoal.Status.CANCELLED:
            raise ValidationError("Objetivo cancelado não pode ser marcado como atingido.")
        goal.current_score = current_score if current_score is not None else (goal.target_score or goal.current_score)
        goal.status = TherapyPlanGoal.Status.ACHIEVED
        goal.save()
        return goal

    @staticmethod
    @transaction.atomic
    def suspend_goal(goal: TherapyPlanGoal, *, reason: str = "") -> TherapyPlanGoal:
        if goal.status == TherapyPlanGoal.Status.ACHIEVED:
            raise ValidationError("Objetivo atingido não pode ser suspenso.")
        goal.status = TherapyPlanGoal.Status.CANCELLED
        goal.notes = _append(goal.notes, "Suspensão", reason)
        goal.save()
        return goal

    # ------------------------------------------------------------------ #
    # Ligação de prescrição
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def link_prescription_to_plan(
        link: TherapyPrescriptionLink, *, plan: TherapyTreatmentPlan
    ) -> TherapyPrescriptionLink:
        if link.status == TherapyPrescriptionLink.Status.CANCELLED:
            raise ValidationError("Ligação cancelada não pode ser vinculada.")
        if plan.discipline != link.discipline:
            raise ValidationError({"plan": "O plano deve pertencer à mesma disciplina terapêutica."})
        link.plan = plan
        link.status = TherapyPrescriptionLink.Status.LINKED  # save() do modelo também força LINKED com plano
        link.save()
        return link

    @staticmethod
    @transaction.atomic
    def close_prescription_link(link: TherapyPrescriptionLink, *, reason: str = "") -> TherapyPrescriptionLink:
        if link.status == TherapyPrescriptionLink.Status.CANCELLED:
            raise ValidationError("Ligação cancelada não pode ser encerrada.")
        link.status = TherapyPrescriptionLink.Status.COMPLETED
        if reason:
            link.notes = _append(link.notes, "Encerramento", reason)
        link.save()
        return link

    # ------------------------------------------------------------------ #
    # Sessões
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def schedule_session(
        plan: TherapyTreatmentPlan, *, scheduled_at=None, therapist=None
    ) -> TherapySession:
        if plan.status != TherapyTreatmentPlan.Status.ACTIVE:
            raise ValidationError("Só é possível agendar sessões em planos ativos.")
        active = plan.sessions.exclude(
            status__in=[TherapySession.Status.CANCELLED, TherapySession.Status.MISSED]
        ).count()
        if active >= plan.planned_sessions:
            raise ValidationError("Limite de sessões previstas do plano atingido.")
        return TherapySession.objects.create(
            tenant=plan.tenant,
            plan=plan,
            patient=plan.patient,
            therapist=therapist or plan.therapist,
            scheduled_at=scheduled_at or timezone.now(),
            status=TherapySession.Status.SCHEDULED,
        )

    @staticmethod
    @transaction.atomic
    def start_session(session: TherapySession, *, therapist=None) -> TherapySession:
        if session.status != TherapySession.Status.SCHEDULED:
            raise ValidationError("Apenas sessões agendadas podem ser iniciadas.")
        if session.plan.status != TherapyTreatmentPlan.Status.ACTIVE:
            raise ValidationError("O plano não está ativo.")
        session.status = TherapySession.Status.IN_PROGRESS
        session.started_at = timezone.now()
        if therapist is not None:
            session.therapist = therapist
        session.save()
        return session

    @staticmethod
    @transaction.atomic
    def finalize_session(
        session: TherapySession,
        *,
        functional_score: int | None = None,
        motor_score: int | None = None,
        communication_score: int | None = None,
        interventions_performed: str = "",
        patient_response: str = "",
        home_guidance: str = "",
        next_steps: str = "",
        summary: str = "",
        recommendations: str = "",
        create_note: bool = True,
    ) -> TherapySession:
        """Finaliza a sessão e gera a evolução terapêutica (§6.13)."""
        if session.status != TherapySession.Status.IN_PROGRESS:
            raise ValidationError("Apenas sessões em execução podem ser finalizadas.")
        if session.therapist_id is None:
            raise ValidationError({"therapist": "A sessão precisa de terapeuta responsável."})

        now = timezone.now()
        session.status = TherapySession.Status.COMPLETED
        session.ended_at = now
        if session.started_at:
            session.duration_minutes = max(0, int((now - session.started_at).total_seconds() // 60))
        if functional_score is not None:
            session.functional_score = functional_score
        if motor_score is not None:
            session.motor_score = motor_score
        if communication_score is not None:
            session.communication_score = communication_score
        if interventions_performed:
            session.interventions_performed = interventions_performed
        if patient_response:
            session.patient_response = patient_response
        if home_guidance:
            session.home_guidance = home_guidance
        if next_steps:
            session.next_steps = next_steps
        session.save()  # save() recalcula progresso do plano (e auto-conclui a 100%)

        if create_note:
            TherapyProgressNote.objects.create(
                tenant=session.tenant,
                plan=session.plan,
                session=session,
                discipline=session.discipline,
                functional_score=session.functional_score,
                motor_score=session.motor_score,
                communication_score=session.communication_score,
                progress_percent=session.plan.progress_percent,
                summary=summary or patient_response or f"Sessão {session.custom_id or session.pk} realizada.",
                recommendations=recommendations or next_steps,
            )
        return session

    @staticmethod
    @transaction.atomic
    def cancel_session(session: TherapySession, *, reason: str = "") -> TherapySession:
        if session.status == TherapySession.Status.COMPLETED:
            raise ValidationError("Uma sessão concluída não pode ser cancelada.")
        if not reason.strip():
            raise ValidationError({"reason": "Informe o motivo do cancelamento."})
        session.status = TherapySession.Status.CANCELLED
        session.notes = _append(session.notes, "Cancelamento", reason)
        session.save()
        return session

    @staticmethod
    @transaction.atomic
    def mark_session_missed(session: TherapySession) -> TherapySession:
        if session.status in {TherapySession.Status.COMPLETED, TherapySession.Status.CANCELLED}:
            raise ValidationError("Não é possível marcar falta numa sessão concluída ou cancelada.")
        session.status = TherapySession.Status.MISSED
        session.save()
        return session
