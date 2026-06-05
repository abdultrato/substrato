from __future__ import annotations

from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from apps.dental.models import (
    DentalAppointment,
    DentalBillingItem,
    DentalPayment,
    DentalProcedureExecution,
    DentalTreatmentPlan,
    DentalTreatmentPlanItem,
    PatientDentalPlanSummary,
)


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

        total_planned = item_queryset.aggregate(total=Sum("unit_price"))["total"] or Decimal("0.00")
        completed_items = item_queryset.filter(status=DentalTreatmentPlanItem.Status.COMPLETED).count()
        pending_items = item_queryset.exclude(status=DentalTreatmentPlanItem.Status.COMPLETED).count()

        payment_queryset = DentalPayment.objects.filter(patient=patient)
        if plan is not None:
            payment_queryset = payment_queryset.filter(treatment_plan=plan)
        total_paid = payment_queryset.aggregate(total=Sum("amount_paid"))["total"] or Decimal("0.00")

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
