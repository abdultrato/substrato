from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.physiotherapy.models import (
    FunctionalAssessment,
    PhysiotherapyDevice,
    RehabilitationDeviceUsage,
    RehabilitationProgressNote,
    RehabilitationSession,
    RehabilitationTreatmentPlan,
)


def _append_note(current: str, label: str, text: str) -> str:
    if not text:
        return current
    return f"{current}\n[{label}] {text}".strip()


class PhysiotherapyWorkflowService:
    """Casos de uso da jornada de reabilitação (§3.14): avaliação → plano → sessões → evolução → alta."""

    # ------------------------------------------------------------------ #
    # Aparelhos
    # ------------------------------------------------------------------ #
    @staticmethod
    def _ensure_device_available(device: PhysiotherapyDevice) -> None:
        if device.status != PhysiotherapyDevice.Status.ACTIVE:
            raise ValidationError({"device": "Aparelho indisponível (manutenção/inativo) não pode ser usado."})
        if device.next_maintenance and device.next_maintenance < timezone.localdate():
            raise ValidationError({"device": "Aparelho com manutenção/calibração vencida — uso bloqueado."})

    @staticmethod
    @transaction.atomic
    def mark_device_maintenance(
        device: PhysiotherapyDevice, *, next_maintenance=None, notes: str = ""
    ) -> PhysiotherapyDevice:
        device.status = PhysiotherapyDevice.Status.MAINTENANCE
        if next_maintenance is not None:
            device.next_maintenance = next_maintenance
        device.notes = _append_note(device.notes, "Manutenção", notes)
        device.save()
        return device

    @staticmethod
    @transaction.atomic
    def mark_device_available(
        device: PhysiotherapyDevice, *, last_maintenance=None, next_maintenance=None
    ) -> PhysiotherapyDevice:
        device.status = PhysiotherapyDevice.Status.ACTIVE
        device.last_maintenance = last_maintenance or timezone.localdate()
        if next_maintenance is not None:
            device.next_maintenance = next_maintenance
        device.save()
        return device

    # ------------------------------------------------------------------ #
    # Avaliação funcional
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def finalize_assessment(assessment: FunctionalAssessment) -> FunctionalAssessment:
        if assessment.status == FunctionalAssessment.Status.CANCELLED:
            raise ValidationError("Uma avaliação cancelada não pode ser finalizada.")
        if assessment.therapist_id is None:
            raise ValidationError({"therapist": "A avaliação precisa de fisioterapeuta responsável."})
        if assessment.status != FunctionalAssessment.Status.FINALIZED:
            assessment.status = FunctionalAssessment.Status.FINALIZED
            assessment.save()
        return assessment

    @staticmethod
    @transaction.atomic
    def cancel_assessment(assessment: FunctionalAssessment, *, reason: str = "") -> FunctionalAssessment:
        if assessment.status == FunctionalAssessment.Status.FINALIZED:
            raise ValidationError("Uma avaliação finalizada não pode ser cancelada (use retificação).")
        assessment.status = FunctionalAssessment.Status.CANCELLED
        assessment.notes = _append_note(assessment.notes, "Cancelamento", reason)
        assessment.save()
        return assessment

    # ------------------------------------------------------------------ #
    # Plano de reabilitação
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def approve_plan(plan: RehabilitationTreatmentPlan) -> RehabilitationTreatmentPlan:
        """Aprova/ativa o plano (§3.14). Exige intervenções definidas."""
        if plan.status != RehabilitationTreatmentPlan.Status.DRAFT:
            raise ValidationError("Apenas planos em rascunho podem ser aprovados.")
        if not plan.interventions.exists():
            raise ValidationError("O plano precisa de pelo menos uma intervenção antes de ser aprovado.")
        plan.status = RehabilitationTreatmentPlan.Status.ACTIVE
        plan.save()
        return plan

    @staticmethod
    @transaction.atomic
    def pause_plan(plan: RehabilitationTreatmentPlan, *, reason: str = "") -> RehabilitationTreatmentPlan:
        if plan.status != RehabilitationTreatmentPlan.Status.ACTIVE:
            raise ValidationError("Apenas planos ativos podem ser pausados.")
        if not reason.strip():
            raise ValidationError({"reason": "Informe o motivo da suspensão."})
        plan.status = RehabilitationTreatmentPlan.Status.PAUSED
        plan.notes = _append_note(plan.notes, "Suspensão", reason)
        plan.save()
        return plan

    @staticmethod
    @transaction.atomic
    def resume_plan(plan: RehabilitationTreatmentPlan) -> RehabilitationTreatmentPlan:
        if plan.status != RehabilitationTreatmentPlan.Status.PAUSED:
            raise ValidationError("Apenas planos pausados podem ser retomados.")
        plan.status = RehabilitationTreatmentPlan.Status.ACTIVE
        plan.save()
        return plan

    @staticmethod
    @transaction.atomic
    def complete_plan(plan: RehabilitationTreatmentPlan) -> RehabilitationTreatmentPlan:
        if plan.status not in {
            RehabilitationTreatmentPlan.Status.ACTIVE,
            RehabilitationTreatmentPlan.Status.PAUSED,
        }:
            raise ValidationError("Apenas planos ativos ou pausados podem ser concluídos.")
        plan.status = RehabilitationTreatmentPlan.Status.COMPLETED
        plan.save()
        return plan

    @staticmethod
    @transaction.atomic
    def cancel_plan(plan: RehabilitationTreatmentPlan, *, reason: str = "") -> RehabilitationTreatmentPlan:
        if plan.status == RehabilitationTreatmentPlan.Status.COMPLETED:
            raise ValidationError("Um plano concluído não pode ser cancelado.")
        if not reason.strip():
            raise ValidationError({"reason": "Informe o motivo do cancelamento."})
        plan.status = RehabilitationTreatmentPlan.Status.CANCELLED
        plan.notes = _append_note(plan.notes, "Cancelamento", reason)
        plan.save()
        return plan

    @staticmethod
    @transaction.atomic
    def discharge_plan(
        plan: RehabilitationTreatmentPlan,
        *,
        summary: str,
        trend: str = RehabilitationProgressNote.Trend.IMPROVED,
        functional_score: int = 0,
        pain_score: int = 0,
        recommendations: str = "",
    ) -> RehabilitationProgressNote:
        """Concede alta fisioterapêutica: evolução final + conclusão do plano (§3.14)."""
        if plan.status not in {
            RehabilitationTreatmentPlan.Status.ACTIVE,
            RehabilitationTreatmentPlan.Status.PAUSED,
        }:
            raise ValidationError("Só é possível dar alta a planos ativos ou pausados.")
        if not summary.strip():
            raise ValidationError({"summary": "Descreva a evolução de alta."})

        note = RehabilitationProgressNote.objects.create(
            tenant=plan.tenant,
            plan=plan,
            trend=trend,
            functional_score=functional_score,
            pain_score=pain_score,
            progress_percent=plan.progress_percent,
            summary=f"[ALTA] {summary}",
            recommendations=recommendations,
        )

        # Cancela sessões futuras ainda agendadas.
        for session in plan.sessions.filter(status=RehabilitationSession.Status.SCHEDULED):
            session.status = RehabilitationSession.Status.CANCELLED
            session.notes = _append_note(session.notes, "Alta", "Sessão cancelada por alta do plano.")
            session.save()

        plan.status = RehabilitationTreatmentPlan.Status.COMPLETED
        plan.save()
        return note

    # ------------------------------------------------------------------ #
    # Sessões
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def schedule_session(
        plan: RehabilitationTreatmentPlan,
        *,
        scheduled_at=None,
        therapist=None,
    ) -> RehabilitationSession:
        if plan.status != RehabilitationTreatmentPlan.Status.ACTIVE:
            raise ValidationError("Só é possível agendar sessões em planos ativos.")
        active_sessions = plan.sessions.exclude(
            status__in=[
                RehabilitationSession.Status.CANCELLED,
                RehabilitationSession.Status.MISSED,
            ]
        ).count()
        if active_sessions >= plan.planned_sessions:
            raise ValidationError("Limite de sessões previstas do plano atingido.")
        return RehabilitationSession.objects.create(
            tenant=plan.tenant,
            plan=plan,
            patient=plan.patient,
            therapist=therapist or plan.therapist,
            scheduled_at=scheduled_at or timezone.now(),
            status=RehabilitationSession.Status.SCHEDULED,
        )

    @staticmethod
    @transaction.atomic
    def start_session(
        session: RehabilitationSession, *, therapist=None, pain_before: int | None = None
    ) -> RehabilitationSession:
        if session.status != RehabilitationSession.Status.SCHEDULED:
            raise ValidationError("Apenas sessões agendadas podem ser iniciadas.")
        if session.plan.status != RehabilitationTreatmentPlan.Status.ACTIVE:
            raise ValidationError("O plano não está ativo.")
        session.status = RehabilitationSession.Status.IN_PROGRESS
        session.started_at = timezone.now()
        if therapist is not None:
            session.therapist = therapist
        if pain_before is not None:
            session.pain_before = pain_before
        session.save()
        return session

    @staticmethod
    @transaction.atomic
    def finalize_session(
        session: RehabilitationSession,
        *,
        pain_after: int | None = None,
        mobility_score: int | None = None,
        strength_score: int | None = None,
        balance_score: int | None = None,
        interventions_performed: str = "",
        patient_response: str = "",
        next_steps: str = "",
        summary: str = "",
        recommendations: str = "",
        create_note: bool = True,
    ) -> RehabilitationSession:
        """Finaliza a sessão e gera a evolução de reabilitação (§3.14 finalizar_sessao)."""
        if session.status != RehabilitationSession.Status.IN_PROGRESS:
            raise ValidationError("Apenas sessões em execução podem ser finalizadas.")
        if session.therapist_id is None:
            raise ValidationError({"therapist": "A sessão precisa de fisioterapeuta responsável."})

        now = timezone.now()
        session.status = RehabilitationSession.Status.COMPLETED
        session.ended_at = now
        if session.started_at:
            session.duration_minutes = max(0, int((now - session.started_at).total_seconds() // 60))
        if pain_after is not None:
            session.pain_after = pain_after
        if mobility_score is not None:
            session.mobility_score = mobility_score
        if strength_score is not None:
            session.strength_score = strength_score
        if balance_score is not None:
            session.balance_score = balance_score
        if interventions_performed:
            session.interventions_performed = interventions_performed
        if patient_response:
            session.patient_response = patient_response
        if next_steps:
            session.next_steps = next_steps
        session.save()  # save() recalcula completed_sessions/progresso do plano

        if create_note:
            if session.pain_after < session.pain_before:
                trend = RehabilitationProgressNote.Trend.IMPROVED
            elif session.pain_after > session.pain_before:
                trend = RehabilitationProgressNote.Trend.WORSENED
            else:
                trend = RehabilitationProgressNote.Trend.STABLE
            RehabilitationProgressNote.objects.create(
                tenant=session.tenant,
                plan=session.plan,
                session=session,
                trend=trend,
                functional_score=session.mobility_score,
                pain_score=session.pain_after,
                progress_percent=session.plan.progress_percent,
                summary=summary or patient_response or f"Sessão {session.custom_id or session.pk} realizada.",
                recommendations=recommendations or next_steps,
            )
        return session

    @staticmethod
    @transaction.atomic
    def cancel_session(session: RehabilitationSession, *, reason: str = "") -> RehabilitationSession:
        if session.status == RehabilitationSession.Status.COMPLETED:
            raise ValidationError("Uma sessão concluída não pode ser cancelada.")
        if not reason.strip():
            raise ValidationError({"reason": "Informe o motivo do cancelamento."})
        session.status = RehabilitationSession.Status.CANCELLED
        session.notes = _append_note(session.notes, "Cancelamento", reason)
        session.save()
        return session

    @staticmethod
    @transaction.atomic
    def mark_session_missed(session: RehabilitationSession) -> RehabilitationSession:
        if session.status in {
            RehabilitationSession.Status.COMPLETED,
            RehabilitationSession.Status.CANCELLED,
        }:
            raise ValidationError("Não é possível marcar falta numa sessão concluída ou cancelada.")
        session.status = RehabilitationSession.Status.MISSED
        session.save()
        return session

    # ------------------------------------------------------------------ #
    # Uso de aparelhos
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def register_device_usage(
        session: RehabilitationSession,
        device: PhysiotherapyDevice,
        *,
        settings: str = "",
        duration_minutes: int = 0,
        outcome: str = "",
        started_at=None,
        ended_at=None,
        notes: str = "",
    ) -> RehabilitationDeviceUsage:
        """Regista o uso de um aparelho na sessão, bloqueando aparelhos indisponíveis (§3.12)."""
        if session.status != RehabilitationSession.Status.IN_PROGRESS:
            raise ValidationError("Só é possível registar uso de aparelho numa sessão em execução.")
        PhysiotherapyWorkflowService._ensure_device_available(device)
        return RehabilitationDeviceUsage.objects.create(
            tenant=session.tenant,
            session=session,
            device=device,
            settings=settings,
            duration_minutes=duration_minutes,
            outcome=outcome,
            started_at=started_at,
            ended_at=ended_at,
            notes=notes,
        )
