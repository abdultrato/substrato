from __future__ import annotations

from decimal import Decimal, InvalidOperation

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from apps.dental.models import (
    DentalApproval,
    DentalAppointment,
    DentalAuditEvent,
    DentalBillingItem,
    DentalClinicalEvolution,
    DentalConsultation,
    DentalMaterialConsumption,
    DentalOdontogramEntry,
    DentalPayment,
    DentalProcedure,
    DentalProcedureExecution,
    DentalQuotation,
    DentalRecord,
    DentalTreatmentPlan,
    DentalTreatmentPlanItem,
    PatientDentalPlanSummary,
)

ZERO = Decimal("0.00")


def _to_decimal(value, *, field: str = "valor") -> Decimal:
    if isinstance(value, Decimal):
        return value
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValidationError({field: "Valor numérico inválido."}) from exc


def record_dental_audit_event(
    *,
    tenant,
    event_type: str,
    summary: str,
    patient=None,
    treatment_plan=None,
    actor_name: str = "",
    metadata: dict | None = None,
) -> DentalAuditEvent:
    """Cria a trilha de auditoria do sector odontológico (§1.27)."""
    resolved_tenant = tenant or getattr(patient, "tenant", None) or getattr(treatment_plan, "tenant", None)
    return DentalAuditEvent.objects.create(
        tenant=resolved_tenant,
        patient=patient,
        treatment_plan=treatment_plan,
        event_type=event_type,
        actor_name=actor_name or "",
        summary=summary,
        metadata=metadata or {},
        event_at=timezone.now(),
    )


# Mapeia a categoria do procedimento para a condição resultante no odontograma.
_PROCEDURE_CONDITION_MAP = {
    DentalProcedure.Category.RESTORATIVE: DentalOdontogramEntry.Condition.RESTORATION,
    DentalProcedure.Category.ENDODONTICS: DentalOdontogramEntry.Condition.ROOT_CANAL,
    DentalProcedure.Category.PROSTHESIS: DentalOdontogramEntry.Condition.PROSTHESIS,
    DentalProcedure.Category.SURGERY: DentalOdontogramEntry.Condition.MISSING,
}


class DentalBillingService:
    """Serviços de faturamento e resumo financeiro do fluxo odontológico."""

    @staticmethod
    @transaction.atomic
    def create_billable_item_from_plan_item(
        treatment_item: DentalTreatmentPlanItem,
        *,
        patient=None,
        procedure_execution: DentalProcedureExecution | None = None,
        description: str = "",
    ) -> DentalBillingItem:
        plan = treatment_item.treatment_plan
        resolved_patient = patient or plan.patient
        if resolved_patient is None:
            raise ValueError("O item do plano precisa de um paciente para gerar faturamento dentário.")

        item = DentalBillingItem.objects.create(
            tenant=treatment_item.tenant,
            patient=resolved_patient,
            treatment_plan=plan,
            treatment_item=treatment_item,
            procedure_execution=procedure_execution,
            description=description or str(treatment_item.procedure),
            quantity=treatment_item.quantity,
            unit_price=treatment_item.unit_price,
            discount_amount=treatment_item.discount_amount,
            billable_at=timezone.now(),
        )

        treatment_item.financial_status = DentalTreatmentPlanItem.FinancialStatus.BILLED
        treatment_item.save(update_fields=["financial_status", "updated_at", "version"])
        return item

    @staticmethod
    @transaction.atomic
    def refresh_patient_plan_summary(
        patient, active_plan: DentalTreatmentPlan | None = None
    ) -> PatientDentalPlanSummary:
        plan = active_plan or (
            DentalTreatmentPlan.objects.filter(patient=patient)
            .exclude(status__in=[DentalTreatmentPlan.Status.CANCELLED, DentalTreatmentPlan.Status.COMPLETED])
            .order_by("-created_at")
            .first()
        )

        item_queryset = DentalTreatmentPlanItem.objects.none()
        if plan is not None:
            item_queryset = DentalTreatmentPlanItem.objects.filter(treatment_plan=plan)

        total_planned = item_queryset.aggregate(total=Sum("unit_price"))["total"] or ZERO
        completed_items = item_queryset.filter(status=DentalTreatmentPlanItem.Status.COMPLETED).count()
        pending_items = item_queryset.exclude(status=DentalTreatmentPlanItem.Status.COMPLETED).count()

        payment_queryset = DentalPayment.objects.filter(patient=patient)
        if plan is not None:
            payment_queryset = payment_queryset.filter(treatment_plan=plan)
        total_paid = payment_queryset.aggregate(total=Sum("amount_paid"))["total"] or ZERO

        next_appointment = (
            DentalAppointment.objects.filter(patient=patient, scheduled_start__gte=timezone.now())
            .order_by("scheduled_start")
            .first()
        )

        return PatientDentalPlanSummary.objects.create(
            tenant=patient.tenant,
            patient=patient,
            active_plan=plan,
            next_appointment=next_appointment,
            plan_status=plan.status if plan is not None else "",
            total_planned_amount=total_planned,
            total_paid=total_paid,
            completed_items=completed_items,
            pending_items=pending_items,
            generated_at=timezone.now(),
        )


class DentalWorkflowService:
    """Casos de uso da jornada odontológica (§1.30): orquestra estados, eventos e integrações."""

    # ------------------------------------------------------------------ #
    # Consultas (agenda)
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def confirm_appointment(appointment: DentalAppointment, *, actor_name: str = "") -> DentalAppointment:
        allowed = {DentalAppointment.Status.SCHEDULED, DentalAppointment.Status.RESCHEDULED}
        if appointment.status not in allowed:
            raise ValidationError("Só é possível confirmar consultas agendadas ou reagendadas.")
        appointment.status = DentalAppointment.Status.CONFIRMED
        appointment.save()
        record_dental_audit_event(
            tenant=appointment.tenant,
            patient=appointment.patient,
            event_type="ConsultaDentariaConfirmada",
            summary=f"Consulta {appointment.custom_id or appointment.pk} confirmada.",
            actor_name=actor_name,
        )
        return appointment

    @staticmethod
    @transaction.atomic
    def start_consultation(
        appointment: DentalAppointment,
        *,
        dentist=None,
        chief_complaint: str = "",
        actor_name: str = "",
    ) -> DentalConsultation:
        startable = {
            DentalAppointment.Status.CONFIRMED,
            DentalAppointment.Status.CHECKED_IN,
        }
        if appointment.status not in startable:
            raise ValidationError("A consulta precisa estar confirmada (ou com paciente presente) para iniciar o atendimento.")

        active = appointment.dental_consultations.exclude(
            status__in=[DentalConsultation.Status.COMPLETED, DentalConsultation.Status.CANCELLED]
        ).first()
        if active is not None:
            raise ValidationError("Já existe um atendimento ativo para esta consulta.")

        resolved_dentist = dentist or appointment.dentist

        # 1:1 lógico — reaproveita o prontuário dentário ativo, cria se necessário.
        record = (
            DentalRecord.objects.filter(patient=appointment.patient)
            .exclude(status=DentalRecord.Status.CANCELLED)
            .order_by("-opened_at")
            .first()
        )
        if record is None:
            record = DentalRecord.objects.create(
                tenant=appointment.tenant,
                patient=appointment.patient,
                dentist=resolved_dentist,
                appointment=appointment,
                status=DentalRecord.Status.ACTIVE,
                chief_complaint=chief_complaint,
            )
        elif record.status == DentalRecord.Status.DRAFT:
            record.status = DentalRecord.Status.ACTIVE
            record.save()

        consultation = DentalConsultation.objects.create(
            tenant=appointment.tenant,
            patient=appointment.patient,
            dentist=resolved_dentist,
            appointment=appointment,
            record=record,
            status=DentalConsultation.Status.IN_PROGRESS,
            chief_complaint=chief_complaint,
            started_at=timezone.now(),
        )

        appointment.status = DentalAppointment.Status.IN_PROGRESS
        appointment.save()

        record_dental_audit_event(
            tenant=appointment.tenant,
            patient=appointment.patient,
            event_type="AtendimentoDentarioIniciado",
            summary=f"Atendimento {consultation.custom_id or consultation.pk} iniciado.",
            actor_name=actor_name,
            metadata={"appointment": appointment.pk, "record": record.pk},
        )
        return consultation

    @staticmethod
    @transaction.atomic
    def complete_consultation(consultation: DentalConsultation, *, actor_name: str = "") -> DentalConsultation:
        if consultation.status == DentalConsultation.Status.CANCELLED:
            raise ValidationError("Um atendimento cancelado não pode ser finalizado.")
        if not consultation.dentist_id:
            raise ValidationError("O atendimento só pode ser finalizado com profissional responsável.")
        if consultation.status != DentalConsultation.Status.COMPLETED:
            consultation.status = DentalConsultation.Status.COMPLETED
            consultation.ended_at = timezone.now()
            consultation.save()

        appointment = consultation.appointment
        if appointment is not None and appointment.status not in {
            DentalAppointment.Status.COMPLETED,
            DentalAppointment.Status.CANCELLED,
        }:
            appointment.status = DentalAppointment.Status.COMPLETED
            appointment.save()

        record_dental_audit_event(
            tenant=consultation.tenant,
            patient=consultation.patient,
            event_type="AtendimentoDentarioConcluido",
            summary=f"Atendimento {consultation.custom_id or consultation.pk} concluído.",
            actor_name=actor_name,
        )
        return consultation

    @staticmethod
    @transaction.atomic
    def finalize_appointment(appointment: DentalAppointment, *, actor_name: str = "") -> DentalAppointment:
        if appointment.status in {DentalAppointment.Status.CANCELLED, DentalAppointment.Status.NO_SHOW}:
            raise ValidationError("Consultas canceladas ou com falta não podem ser finalizadas.")
        appointment.status = DentalAppointment.Status.COMPLETED
        appointment.save()
        record_dental_audit_event(
            tenant=appointment.tenant,
            patient=appointment.patient,
            event_type="ConsultaDentariaFinalizada",
            summary=f"Consulta {appointment.custom_id or appointment.pk} finalizada.",
            actor_name=actor_name,
        )
        return appointment

    @staticmethod
    @transaction.atomic
    def cancel_appointment(appointment: DentalAppointment, *, reason: str = "", actor_name: str = "") -> DentalAppointment:
        if appointment.status == DentalAppointment.Status.COMPLETED:
            raise ValidationError("Uma consulta concluída não pode ser cancelada.")
        if not reason.strip():
            raise ValidationError({"reason": "Informe o motivo do cancelamento."})
        appointment.status = DentalAppointment.Status.CANCELLED
        appointment.notes = f"{appointment.notes}\n[Cancelamento] {reason}".strip()
        appointment.save()
        record_dental_audit_event(
            tenant=appointment.tenant,
            patient=appointment.patient,
            event_type="ConsultaDentariaCancelada",
            summary=f"Consulta {appointment.custom_id or appointment.pk} cancelada.",
            actor_name=actor_name,
            metadata={"reason": reason},
        )
        return appointment

    @staticmethod
    @transaction.atomic
    def mark_no_show(appointment: DentalAppointment, *, actor_name: str = "") -> DentalAppointment:
        if appointment.status in {DentalAppointment.Status.COMPLETED, DentalAppointment.Status.CANCELLED}:
            raise ValidationError("Não é possível marcar falta numa consulta concluída ou cancelada.")
        appointment.status = DentalAppointment.Status.NO_SHOW
        appointment.save()
        record_dental_audit_event(
            tenant=appointment.tenant,
            patient=appointment.patient,
            event_type="ConsultaDentariaFalta",
            summary=f"Paciente faltou à consulta {appointment.custom_id or appointment.pk}.",
            actor_name=actor_name,
        )
        return appointment

    # ------------------------------------------------------------------ #
    # Odontograma (histórico por dente/face)
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def record_odontogram_entry(
        record: DentalRecord,
        *,
        tooth_number: str,
        surface: str = DentalOdontogramEntry.Surface.WHOLE,
        condition: str = DentalOdontogramEntry.Condition.HEALTHY,
        status: str = DentalOdontogramEntry.Status.OBSERVED,
        severity: str = "",
        diagnosis: str = "",
        procedure: DentalProcedure | None = None,
        odontogram=None,
        notes: str = "",
        actor_name: str = "",
    ) -> DentalOdontogramEntry:
        """Regista (ou atualiza) o estado de um dente/face mantendo histórico via auditoria."""
        existing = DentalOdontogramEntry.objects.filter(
            record=record, tooth_number=tooth_number, surface=surface
        ).first()

        previous_state = None
        if existing is not None:
            previous_state = {"condition": existing.condition, "status": existing.status}
            existing.condition = condition
            existing.status = status
            if severity:
                existing.severity = severity
            if diagnosis:
                existing.diagnosis = diagnosis
            if procedure is not None:
                existing.procedure = procedure
            if odontogram is not None:
                existing.odontogram = odontogram
            if notes:
                existing.notes = notes
            existing.save()
            entry = existing
        else:
            entry = DentalOdontogramEntry.objects.create(
                tenant=record.tenant,
                record=record,
                odontogram=odontogram,
                tooth_number=tooth_number,
                surface=surface,
                condition=condition,
                status=status,
                severity=severity,
                diagnosis=diagnosis,
                procedure=procedure,
                notes=notes,
            )

        record_dental_audit_event(
            tenant=record.tenant,
            patient=record.patient,
            event_type="OdontogramaAtualizado",
            summary=f"Dente {tooth_number} ({surface}) → {condition}.",
            actor_name=actor_name,
            metadata={
                "tooth_number": tooth_number,
                "surface": surface,
                "previous": previous_state,
                "current": {"condition": condition, "status": status},
            },
        )
        return entry

    # ------------------------------------------------------------------ #
    # Plano de tratamento e orçamento
    # ------------------------------------------------------------------ #
    @staticmethod
    def _plan_items_subtotal(plan: DentalTreatmentPlan) -> Decimal:
        total = sum((item.final_price for item in plan.items.all()), ZERO)
        return total.quantize(Decimal("0.01"))

    @staticmethod
    @transaction.atomic
    def propose_plan(plan: DentalTreatmentPlan, *, actor_name: str = "") -> DentalTreatmentPlan:
        if plan.status != DentalTreatmentPlan.Status.DRAFT:
            raise ValidationError("Apenas planos em rascunho podem ser apresentados.")
        if not plan.items.exists():
            raise ValidationError("O plano precisa de pelo menos um item para ser apresentado.")
        plan.estimated_total = DentalWorkflowService._plan_items_subtotal(plan)
        plan.status = DentalTreatmentPlan.Status.PROPOSED
        plan.save()
        record_dental_audit_event(
            tenant=plan.tenant,
            patient=plan.patient,
            treatment_plan=plan,
            event_type="PlanoTratamentoDentarioApresentado",
            summary=f"Plano {plan.title} apresentado ao paciente.",
            actor_name=actor_name,
        )
        return plan

    @staticmethod
    @transaction.atomic
    def generate_quotation(
        plan: DentalTreatmentPlan,
        *,
        valid_until=None,
        discount_amount=ZERO,
        tax_amount=ZERO,
        issued_by=None,
        payment_terms: str = "",
        actor_name: str = "",
    ) -> DentalQuotation:
        if plan.status in {DentalTreatmentPlan.Status.CANCELLED, DentalTreatmentPlan.Status.COMPLETED}:
            raise ValidationError("Não é possível orçar um plano cancelado ou concluído.")
        if not plan.items.exists():
            raise ValidationError("O plano precisa de itens para gerar orçamento.")

        discount_amount = _to_decimal(discount_amount, field="discount_amount")
        tax_amount = _to_decimal(tax_amount, field="tax_amount")
        subtotal = DentalWorkflowService._plan_items_subtotal(plan)
        total = subtotal - discount_amount + tax_amount
        if total < ZERO:
            total = ZERO

        quotation = DentalQuotation.objects.create(
            tenant=plan.tenant,
            treatment_plan=plan,
            patient=plan.patient,
            issued_by=issued_by,
            status=DentalQuotation.Status.ISSUED,
            issued_at=timezone.now(),
            valid_until=valid_until,
            subtotal=subtotal,
            discount_amount=discount_amount,
            tax_amount=tax_amount,
            total_amount=total,
            payment_terms=payment_terms,
        )

        if plan.status == DentalTreatmentPlan.Status.DRAFT:
            plan.estimated_total = subtotal
            plan.status = DentalTreatmentPlan.Status.PROPOSED
            plan.save()

        record_dental_audit_event(
            tenant=plan.tenant,
            patient=plan.patient,
            treatment_plan=plan,
            event_type="OrcamentoDentarioEmitido",
            summary=f"Orçamento {quotation.custom_id or quotation.pk} emitido ({total}).",
            actor_name=actor_name,
            metadata={"subtotal": str(subtotal), "total": str(total)},
        )
        return quotation

    @staticmethod
    @transaction.atomic
    def approve_quotation(
        quotation: DentalQuotation,
        *,
        approved_by_name: str = "",
        approval_scope: str = DentalApproval.Scope.FULL_PLAN,
        consent_signed: bool = False,
        consent_document_reference: str = "",
        actor_name: str = "",
    ) -> DentalApproval:
        is_expired = quotation.valid_until is not None and quotation.valid_until < timezone.localdate()
        if quotation.status == DentalQuotation.Status.EXPIRED or is_expired:
            raise ValidationError("Orçamento expirado: é necessário renovar antes de aprovar.")
        if quotation.status in {DentalQuotation.Status.REJECTED, DentalQuotation.Status.CONVERTED_TO_INVOICE}:
            raise ValidationError("Este orçamento não pode ser aprovado no estado atual.")

        plan = quotation.treatment_plan
        now = timezone.now()

        quotation.status = DentalQuotation.Status.ACCEPTED
        quotation.save()

        approval = DentalApproval.objects.create(
            tenant=plan.tenant,
            treatment_plan=plan,
            quotation=quotation,
            patient=plan.patient,
            approved_by_name=approved_by_name,
            approval_scope=approval_scope,
            approved_amount=quotation.total_amount,
            consent_signed=consent_signed,
            consent_document_reference=consent_document_reference,
            approved_at=now,
        )

        plan.status = DentalTreatmentPlan.Status.APPROVED
        plan.approved_at = now
        plan.approved_amount = quotation.total_amount
        plan.save()

        for item in plan.items.filter(status=DentalTreatmentPlanItem.Status.PLANNED):
            item.status = DentalTreatmentPlanItem.Status.APPROVED
            item.approved_at = now
            item.save()

        from apps.dental.models import DentalTreatmentPhase

        for phase in plan.phases.filter(status=DentalTreatmentPhase.Status.PLANNED):
            phase.status = DentalTreatmentPhase.Status.APPROVED
            phase.save()

        record_dental_audit_event(
            tenant=plan.tenant,
            patient=plan.patient,
            treatment_plan=plan,
            event_type="OrcamentoDentarioAprovado",
            summary=f"Orçamento {quotation.custom_id or quotation.pk} aprovado por {approved_by_name or 'paciente'}.",
            actor_name=actor_name,
            metadata={"approved_amount": str(quotation.total_amount), "consent_signed": consent_signed},
        )
        return approval

    @staticmethod
    @transaction.atomic
    def reject_quotation(quotation: DentalQuotation, *, reason: str = "", actor_name: str = "") -> DentalQuotation:
        if quotation.status in {DentalQuotation.Status.ACCEPTED, DentalQuotation.Status.CONVERTED_TO_INVOICE}:
            raise ValidationError("Um orçamento aceite/convertido não pode ser rejeitado.")
        quotation.status = DentalQuotation.Status.REJECTED
        if reason:
            quotation.notes = f"{quotation.notes}\n[Rejeição] {reason}".strip()
        quotation.save()
        record_dental_audit_event(
            tenant=quotation.tenant,
            patient=quotation.patient,
            treatment_plan=quotation.treatment_plan,
            event_type="OrcamentoDentarioRejeitado",
            summary=f"Orçamento {quotation.custom_id or quotation.pk} rejeitado.",
            actor_name=actor_name,
            metadata={"reason": reason},
        )
        return quotation

    @staticmethod
    @transaction.atomic
    def complete_plan(plan: DentalTreatmentPlan, *, actor_name: str = "") -> DentalTreatmentPlan:
        if plan.status in {DentalTreatmentPlan.Status.CANCELLED, DentalTreatmentPlan.Status.COMPLETED}:
            raise ValidationError("Plano já encerrado.")
        pending = plan.items.exclude(
            status__in=[
                DentalTreatmentPlanItem.Status.COMPLETED,
                DentalTreatmentPlanItem.Status.CANCELLED,
                DentalTreatmentPlanItem.Status.REFUNDED,
            ]
        )
        if pending.exists():
            raise ValidationError("Existem itens por concluir ou justificar antes de encerrar o plano.")
        plan.status = DentalTreatmentPlan.Status.COMPLETED
        plan.save()
        record_dental_audit_event(
            tenant=plan.tenant,
            patient=plan.patient,
            treatment_plan=plan,
            event_type="PlanoTratamentoDentarioConcluido",
            summary=f"Plano {plan.title} concluído.",
            actor_name=actor_name,
        )
        return plan

    @staticmethod
    @transaction.atomic
    def cancel_plan(plan: DentalTreatmentPlan, *, reason: str = "", actor_name: str = "") -> DentalTreatmentPlan:
        if plan.status == DentalTreatmentPlan.Status.COMPLETED:
            raise ValidationError("Um plano concluído não pode ser cancelado.")
        if not reason.strip():
            raise ValidationError({"reason": "Informe o motivo do cancelamento."})
        plan.status = DentalTreatmentPlan.Status.CANCELLED
        plan.notes = f"{plan.notes}\n[Cancelamento] {reason}".strip()
        plan.save()
        record_dental_audit_event(
            tenant=plan.tenant,
            patient=plan.patient,
            treatment_plan=plan,
            event_type="PlanoTratamentoDentarioCancelado",
            summary=f"Plano {plan.title} cancelado.",
            actor_name=actor_name,
            metadata={"reason": reason},
        )
        return plan

    # ------------------------------------------------------------------ #
    # Execução de procedimentos
    # ------------------------------------------------------------------ #
    _EXECUTABLE_ITEM_STATUSES = {
        DentalTreatmentPlanItem.Status.APPROVED,
        DentalTreatmentPlanItem.Status.AUTHORIZED,
        DentalTreatmentPlanItem.Status.SCHEDULED,
        DentalTreatmentPlanItem.Status.IN_PROGRESS,
        DentalTreatmentPlanItem.Status.PENDING_PAYMENT,
    }

    @staticmethod
    @transaction.atomic
    def execute_procedure(
        *,
        treatment_item: DentalTreatmentPlanItem | None = None,
        procedure: DentalProcedure | None = None,
        patient=None,
        consultation: DentalConsultation | None = None,
        appointment: DentalAppointment | None = None,
        performed_by=None,
        tooth_number: str = "",
        surface: str = "",
        materials: list[dict] | None = None,
        anesthesia_used: str = "",
        clinical_notes: str = "",
        evolution_summary: str = "",
        update_odontogram: bool = True,
        generate_billing: bool = True,
        actor_name: str = "",
    ) -> DentalProcedureExecution:
        """Executa um procedimento e propaga odontograma, materiais, faturação e evolução (§1.30)."""
        plan = None
        if treatment_item is not None:
            plan = treatment_item.treatment_plan
            patient = patient or plan.patient
            procedure = procedure or treatment_item.procedure
            tooth_number = tooth_number or treatment_item.tooth_number
            surface = surface or treatment_item.surface
            if treatment_item.status not in DentalWorkflowService._EXECUTABLE_ITEM_STATUSES:
                raise ValidationError("O item do plano precisa estar aprovado/autorizado antes da execução.")
        if patient is None or procedure is None:
            raise ValidationError("Informe paciente e procedimento para registar a execução.")
        if performed_by is None:
            raise ValidationError("O procedimento executado precisa de profissional responsável.")

        now = timezone.now()
        material_rows = materials or []
        materials_summary = ", ".join(
            str(row.get("material_name", "")).strip() for row in material_rows if row.get("material_name")
        )

        execution = DentalProcedureExecution.objects.create(
            tenant=patient.tenant,
            patient=patient,
            consultation=consultation,
            treatment_plan=plan,
            treatment_item=treatment_item,
            appointment=appointment or (consultation.appointment if consultation else None),
            procedure=procedure,
            performed_by=performed_by,
            tooth_number=tooth_number,
            surface=surface,
            status=DentalProcedureExecution.Status.COMPLETED,
            started_at=now,
            performed_at=now,
            materials_used=materials_summary,
            anesthesia_used=anesthesia_used,
            clinical_notes=clinical_notes,
        )

        if treatment_item is not None:
            treatment_item.status = DentalTreatmentPlanItem.Status.COMPLETED
            treatment_item.completed_at = now
            treatment_item.save()

        # Consumo de materiais (integração com farmácia/armazém: baixa de stock fica para o registo do movimento).
        for row in material_rows:
            material_name = str(row.get("material_name", "")).strip()
            if not material_name:
                continue
            DentalMaterialConsumption.objects.create(
                tenant=patient.tenant,
                procedure_execution=execution,
                material_name=material_name,
                quantity=_to_decimal(row.get("quantity", "1"), field="quantity"),
                unit_cost=_to_decimal(row.get("unit_cost", "0"), field="unit_cost"),
                notes=str(row.get("notes", "")),
            )

        # Odontograma — estado tratado.
        record = None
        if consultation is not None and consultation.record_id:
            record = consultation.record
        else:
            record = (
                DentalRecord.objects.filter(patient=patient)
                .exclude(status=DentalRecord.Status.CANCELLED)
                .order_by("-opened_at")
                .first()
            )
        if update_odontogram and tooth_number and record is not None:
            DentalWorkflowService.record_odontogram_entry(
                record,
                tooth_number=tooth_number,
                surface=surface or DentalOdontogramEntry.Surface.WHOLE,
                condition=_PROCEDURE_CONDITION_MAP.get(
                    procedure.category, DentalOdontogramEntry.Condition.RESTORATION
                ),
                status=DentalOdontogramEntry.Status.TREATED,
                procedure=procedure,
                actor_name=actor_name,
            )

        # Faturação.
        billing_item = None
        if generate_billing:
            if treatment_item is not None:
                billing_item = DentalBillingService.create_billable_item_from_plan_item(
                    treatment_item, patient=patient, procedure_execution=execution
                )
            else:
                billing_item = DentalBillingItem.objects.create(
                    tenant=patient.tenant,
                    patient=patient,
                    procedure_execution=execution,
                    description=str(procedure),
                    quantity=Decimal("1.00"),
                    unit_price=procedure.base_price,
                    billable_at=now,
                )

        # Evolução clínica.
        DentalClinicalEvolution.objects.create(
            tenant=patient.tenant,
            patient=patient,
            record=record,
            consultation=consultation,
            procedure_execution=execution,
            treatment_plan=plan,
            dentist=performed_by,
            summary=evolution_summary or f"Execução de {procedure} concluída.",
            evolved_at=now,
        )

        record_dental_audit_event(
            tenant=patient.tenant,
            patient=patient,
            treatment_plan=plan,
            event_type="ProcedimentoDentarioExecutado",
            summary=f"Procedimento {procedure} executado (dente {tooth_number or '-'}).",
            actor_name=actor_name,
            metadata={
                "execution": execution.pk,
                "billing_item": billing_item.pk if billing_item else None,
            },
        )

        DentalBillingService.refresh_patient_plan_summary(patient, plan)
        return execution

    @staticmethod
    @transaction.atomic
    def refund_procedure(
        execution: DentalProcedureExecution, *, reason: str = "", actor_name: str = ""
    ) -> DentalProcedureExecution:
        if execution.status == DentalProcedureExecution.Status.CANCELLED:
            raise ValidationError("Procedimento já estornado/cancelado.")
        if not reason.strip():
            raise ValidationError({"reason": "Informe o motivo do estorno."})

        execution.status = DentalProcedureExecution.Status.CANCELLED
        execution.clinical_notes = f"{execution.clinical_notes}\n[Estorno] {reason}".strip()
        execution.save()

        for billing_item in execution.billing_items.exclude(
            status__in=[DentalBillingItem.Status.CANCELLED, DentalBillingItem.Status.REFUNDED]
        ):
            billing_item.status = DentalBillingItem.Status.REFUNDED
            billing_item.save()

        if execution.treatment_item_id:
            item = execution.treatment_item
            item.status = DentalTreatmentPlanItem.Status.REFUNDED
            item.financial_status = DentalTreatmentPlanItem.FinancialStatus.REFUNDED
            item.save()

        record_dental_audit_event(
            tenant=execution.tenant,
            patient=execution.patient,
            treatment_plan=execution.treatment_plan,
            event_type="ProcedimentoDentarioEstornado",
            summary=f"Procedimento {execution.custom_id or execution.pk} estornado.",
            actor_name=actor_name,
            metadata={"reason": reason},
        )
        DentalBillingService.refresh_patient_plan_summary(execution.patient, execution.treatment_plan)
        return execution

    # ------------------------------------------------------------------ #
    # Pagamentos
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def register_payment(
        *,
        patient,
        amount,
        amount_due=None,
        treatment_plan: DentalTreatmentPlan | None = None,
        treatment_item: DentalTreatmentPlanItem | None = None,
        quotation: DentalQuotation | None = None,
        payment_kind: str = DentalPayment.PaymentKind.DEPOSIT,
        method: str = "",
        external_reference: str = "",
        due_date=None,
        actor_name: str = "",
    ) -> DentalPayment:
        amount = _to_decimal(amount, field="amount")
        if amount <= ZERO:
            raise ValidationError({"amount": "O valor do pagamento deve ser positivo."})
        due = _to_decimal(amount_due, field="amount_due") if amount_due is not None else amount

        if amount >= due:
            status = DentalPayment.Status.PAID
        else:
            status = DentalPayment.Status.PARTIALLY_PAID

        payment = DentalPayment.objects.create(
            tenant=patient.tenant,
            patient=patient,
            treatment_plan=treatment_plan,
            treatment_item=treatment_item,
            quotation=quotation,
            payment_kind=payment_kind,
            status=status,
            amount_due=due,
            amount_paid=amount,
            method=method,
            external_reference=external_reference,
            paid_at=timezone.now(),
            due_date=due_date,
        )

        if treatment_item is not None:
            treatment_item.financial_status = (
                DentalTreatmentPlanItem.FinancialStatus.PAID
                if status == DentalPayment.Status.PAID
                else DentalTreatmentPlanItem.FinancialStatus.PARTIALLY_PAID
            )
            treatment_item.save()

        record_dental_audit_event(
            tenant=patient.tenant,
            patient=patient,
            treatment_plan=treatment_plan,
            event_type="PagamentoDentarioConfirmado",
            summary=f"Pagamento de {amount} registado ({status}).",
            actor_name=actor_name,
            metadata={"amount": str(amount), "amount_due": str(due)},
        )
        DentalBillingService.refresh_patient_plan_summary(patient, treatment_plan)
        return payment
