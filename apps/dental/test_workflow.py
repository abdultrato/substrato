from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from uuid import uuid4

import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.clinical.models.patient import Patient
from apps.dental.models import (
    DentalAppointment,
    DentalAuditEvent,
    DentalBillingItem,
    DentalClinicalEvolution,
    DentalConsultation,
    DentalPayment,
    DentalProcedure,
    DentalProcedureExecution,
    DentalQuotation,
    DentalRecord,
    DentalTreatmentPlan,
    DentalTreatmentPlanItem,
)
from apps.dental.services import DentalWorkflowService
from apps.human_resources.models import Employee
from apps.tenants.models.tenant import Tenant


def _tenant():
    suffix = uuid4().hex[:8]
    return Tenant.objects.create(
        identifier=f"tn-{suffix}",
        name="Tenant Dental WF",
        domain=f"{suffix}.local",
        active=True,
    )


def _patient(tenant):
    return Patient.objects.create(
        tenant=tenant,
        name="Paciente WF",
        document_number=f"WF-{uuid4().hex[:6]}",
    )


def _employee(tenant):
    return Employee.objects.create(
        tenant=tenant,
        name="Dentista WF",
        email=f"{uuid4().hex[:8]}@wf.test",
    )


def _procedure(tenant, *, base_price="1000.00", category=DentalProcedure.Category.RESTORATIVE):
    return DentalProcedure.objects.create(
        tenant=tenant,
        name="Restauração WF",
        category=category,
        base_price=Decimal(base_price),
    )


def _appointment(tenant, patient, dentist):
    return DentalAppointment.objects.create(
        tenant=tenant,
        patient=patient,
        dentist=dentist,
        scheduled_start=timezone.now() + timedelta(hours=1),
    )


def _plan_with_item(tenant, patient, dentist=None, *, unit_price="1000.00"):
    plan = DentalTreatmentPlan.objects.create(
        tenant=tenant,
        patient=patient,
        dentist=dentist,
        title="Plano WF",
    )
    item = DentalTreatmentPlanItem.objects.create(
        treatment_plan=plan,
        procedure=_procedure(tenant),
        quantity=Decimal("1.00"),
        unit_price=Decimal(unit_price),
        tooth_number="36",
    )
    return plan, item


@pytest.mark.django_db
def test_confirm_start_and_complete_appointment_creates_record_and_consultation():
    tenant = _tenant()
    patient = _patient(tenant)
    dentist = _employee(tenant)
    appointment = _appointment(tenant, patient, dentist)

    DentalWorkflowService.confirm_appointment(appointment, actor_name="Recepção")
    assert appointment.status == DentalAppointment.Status.CONFIRMED

    consultation = DentalWorkflowService.start_consultation(appointment, actor_name="Dr. WF")
    appointment.refresh_from_db()
    assert appointment.status == DentalAppointment.Status.IN_PROGRESS
    assert consultation.status == DentalConsultation.Status.IN_PROGRESS
    assert consultation.record_id is not None
    assert DentalRecord.objects.filter(patient=patient).count() == 1

    DentalWorkflowService.complete_consultation(consultation, actor_name="Dr. WF")
    consultation.refresh_from_db()
    appointment.refresh_from_db()
    assert consultation.status == DentalConsultation.Status.COMPLETED
    assert appointment.status == DentalAppointment.Status.COMPLETED

    assert DentalAuditEvent.objects.filter(
        tenant=tenant, event_type="AtendimentoDentarioIniciado"
    ).exists()


@pytest.mark.django_db
def test_start_consultation_requires_confirmed_appointment():
    tenant = _tenant()
    patient = _patient(tenant)
    dentist = _employee(tenant)
    appointment = _appointment(tenant, patient, dentist)  # SCHEDULED

    with pytest.raises(ValidationError):
        DentalWorkflowService.start_consultation(appointment)


@pytest.mark.django_db
def test_generate_and_approve_quotation_cascades_to_plan_and_items():
    tenant = _tenant()
    patient = _patient(tenant)
    dentist = _employee(tenant)
    plan, item = _plan_with_item(tenant, patient, dentist, unit_price="1500.00")

    quotation = DentalWorkflowService.generate_quotation(
        plan, discount_amount=Decimal("100.00"), tax_amount=Decimal("0.00")
    )
    assert quotation.status == DentalQuotation.Status.ISSUED
    assert quotation.subtotal == Decimal("1500.00")
    assert quotation.total_amount == Decimal("1400.00")
    plan.refresh_from_db()
    assert plan.status == DentalTreatmentPlan.Status.PROPOSED

    approval = DentalWorkflowService.approve_quotation(
        quotation, approved_by_name="Paciente WF", consent_signed=True
    )
    quotation.refresh_from_db()
    plan.refresh_from_db()
    item.refresh_from_db()
    assert quotation.status == DentalQuotation.Status.ACCEPTED
    assert plan.status == DentalTreatmentPlan.Status.APPROVED
    assert plan.approved_amount == Decimal("1400.00")
    assert item.status == DentalTreatmentPlanItem.Status.APPROVED
    assert approval.approved_amount == Decimal("1400.00")


@pytest.mark.django_db
def test_approve_expired_quotation_is_blocked():
    tenant = _tenant()
    patient = _patient(tenant)
    plan, _item = _plan_with_item(tenant, patient)
    quotation = DentalWorkflowService.generate_quotation(
        plan, valid_until=timezone.localdate() - timedelta(days=1)
    )
    with pytest.raises(ValidationError):
        DentalWorkflowService.approve_quotation(quotation, approved_by_name="Paciente")


@pytest.mark.django_db
def test_execute_procedure_propagates_billing_odontogram_and_evolution():
    tenant = _tenant()
    patient = _patient(tenant)
    dentist = _employee(tenant)
    record = DentalRecord.objects.create(
        tenant=tenant, patient=patient, dentist=dentist, status=DentalRecord.Status.ACTIVE
    )
    plan, item = _plan_with_item(tenant, patient, dentist, unit_price="1200.00")
    quotation = DentalWorkflowService.generate_quotation(plan)
    DentalWorkflowService.approve_quotation(quotation, approved_by_name="Paciente WF")
    item.refresh_from_db()

    execution = DentalWorkflowService.execute_procedure(
        treatment_item=item,
        performed_by=dentist,
        materials=[{"material_name": "Resina", "quantity": "1", "unit_cost": "120.00"}],
        clinical_notes="Sem intercorrências.",
        actor_name="Dr. WF",
    )

    item.refresh_from_db()
    assert execution.status == DentalProcedureExecution.Status.COMPLETED
    assert item.status == DentalTreatmentPlanItem.Status.COMPLETED
    assert item.financial_status == DentalTreatmentPlanItem.FinancialStatus.BILLED

    billing = DentalBillingItem.objects.filter(procedure_execution=execution).first()
    assert billing is not None
    assert billing.unit_price == Decimal("1200.00")

    assert DentalClinicalEvolution.objects.filter(procedure_execution=execution).exists()
    assert execution.material_consumptions.count() == 1
    # Odontograma do dente 36 ficou tratado.
    assert record.odontogram_entries.filter(tooth_number="36").exists()
    assert DentalAuditEvent.objects.filter(
        tenant=tenant, event_type="ProcedimentoDentarioExecutado"
    ).exists()


@pytest.mark.django_db
def test_execute_requires_approved_item():
    tenant = _tenant()
    patient = _patient(tenant)
    dentist = _employee(tenant)
    _plan, item = _plan_with_item(tenant, patient, dentist)  # item PLANNED

    with pytest.raises(ValidationError):
        DentalWorkflowService.execute_procedure(treatment_item=item, performed_by=dentist)


@pytest.mark.django_db
def test_register_payment_marks_item_paid():
    tenant = _tenant()
    patient = _patient(tenant)
    plan, item = _plan_with_item(tenant, patient, unit_price="800.00")

    payment = DentalWorkflowService.register_payment(
        patient=patient,
        amount=Decimal("800.00"),
        treatment_plan=plan,
        treatment_item=item,
        payment_kind=DentalPayment.PaymentKind.PROCEDURE,
        method="MPESA",
    )
    item.refresh_from_db()
    assert payment.status == DentalPayment.Status.PAID
    assert item.financial_status == DentalTreatmentPlanItem.FinancialStatus.PAID

    partial = DentalWorkflowService.register_payment(
        patient=patient,
        amount=Decimal("200.00"),
        amount_due=Decimal("800.00"),
        treatment_plan=plan,
    )
    assert partial.status == DentalPayment.Status.PARTIALLY_PAID


@pytest.mark.django_db
def test_refund_procedure_reverses_billing_and_item():
    tenant = _tenant()
    patient = _patient(tenant)
    dentist = _employee(tenant)
    plan, item = _plan_with_item(tenant, patient, dentist)
    quotation = DentalWorkflowService.generate_quotation(plan)
    DentalWorkflowService.approve_quotation(quotation, approved_by_name="Paciente")
    item.refresh_from_db()
    execution = DentalWorkflowService.execute_procedure(treatment_item=item, performed_by=dentist)

    DentalWorkflowService.refund_procedure(execution, reason="Material com defeito")
    execution.refresh_from_db()
    item.refresh_from_db()
    assert execution.status == DentalProcedureExecution.Status.CANCELLED
    assert item.status == DentalTreatmentPlanItem.Status.REFUNDED
    assert item.financial_status == DentalTreatmentPlanItem.FinancialStatus.REFUNDED
    assert DentalBillingItem.objects.filter(
        procedure_execution=execution, status=DentalBillingItem.Status.REFUNDED
    ).exists()


@pytest.mark.django_db
def test_cancel_appointment_requires_reason():
    tenant = _tenant()
    patient = _patient(tenant)
    dentist = _employee(tenant)
    appointment = _appointment(tenant, patient, dentist)
    with pytest.raises(ValidationError):
        DentalWorkflowService.cancel_appointment(appointment, reason="")
    DentalWorkflowService.cancel_appointment(appointment, reason="Paciente desmarcou")
    assert appointment.status == DentalAppointment.Status.CANCELLED
