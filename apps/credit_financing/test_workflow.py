from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from uuid import uuid4

import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.clinical.models.patient import Patient
from apps.credit_financing.models import (
    CreditInstallment,
    ElectiveProcedureFinancing,
    HealthConsortium,
    ReimbursementClaim,
)
from apps.credit_financing.services import CreditFinancingWorkflowService
from apps.tenants.models.tenant import Tenant


def _tenant():
    suffix = uuid4().hex[:8]
    return Tenant.objects.create(
        identifier=f"tn-cf-{suffix}", name="Tenant CF", domain=f"{suffix}.local", active=True
    )


def _patient(tenant):
    return Patient.objects.create(tenant=tenant, name="Paciente CF", document_number=f"CF-{uuid4().hex[:6]}")


def _financing(tenant, patient, *, principal="6000.00", down="0.00", term=6, rate="0.00"):
    return ElectiveProcedureFinancing.objects.create(
        tenant=tenant,
        patient=patient,
        procedure_description="Cirurgia eletiva",
        principal_amount=Decimal(principal),
        down_payment=Decimal(down),
        term_months=term,
        annual_interest_rate=Decimal(rate),
        first_due_date=timezone.localdate() + timedelta(days=30),
    )


@pytest.mark.django_db
def test_financing_approve_generates_installments_and_payment_settles():
    tenant = _tenant()
    patient = _patient(tenant)
    financing = _financing(tenant, patient, principal="6000.00", term=6)
    assert financing.financed_amount == Decimal("6000.00")
    assert financing.installment_amount == Decimal("1000.00")  # sem juros

    CreditFinancingWorkflowService.approve_financing(financing)
    financing.refresh_from_db()
    assert financing.status == ElectiveProcedureFinancing.Status.ACTIVE
    assert financing.installments.count() == 6
    assert all(i.total_amount == Decimal("1000.00") for i in financing.installments.all())

    # Não regenerar parcelas.
    with pytest.raises(ValidationError):
        CreditFinancingWorkflowService.generate_installments(financing)

    # Pagar todas as parcelas liquida o financiamento.
    for installment in financing.installments.all():
        CreditFinancingWorkflowService.pay_installment(installment, amount="1000.00")
    financing.refresh_from_db()
    assert financing.status == ElectiveProcedureFinancing.Status.PAID


@pytest.mark.django_db
def test_partial_payment_keeps_balance():
    tenant = _tenant()
    financing = _financing(tenant, _patient(tenant), term=2, principal="2000.00")
    CreditFinancingWorkflowService.approve_financing(financing)
    inst = financing.installments.first()
    CreditFinancingWorkflowService.pay_installment(inst, amount="400.00")
    assert inst.status == CreditInstallment.Status.PARTIAL
    assert inst.balance_due == Decimal("600.00")

    with pytest.raises(ValidationError):
        CreditFinancingWorkflowService.pay_installment(inst, amount="9999.00")  # excede saldo


@pytest.mark.django_db
def test_late_fee_increases_total_and_reverse_reopens():
    tenant = _tenant()
    financing = _financing(tenant, _patient(tenant), term=1, principal="1000.00")
    CreditFinancingWorkflowService.approve_financing(financing)
    inst = financing.installments.first()

    CreditFinancingWorkflowService.apply_late_fee(inst, fee_amount="50.00", interest_amount="10.00")
    assert inst.total_amount == Decimal("1060.00")

    CreditFinancingWorkflowService.pay_installment(inst, amount="1060.00")
    assert inst.status == CreditInstallment.Status.PAID
    financing.refresh_from_db()
    assert financing.status == ElectiveProcedureFinancing.Status.PAID

    CreditFinancingWorkflowService.reverse_payment(inst, reason="Cheque devolvido")
    inst.refresh_from_db()
    financing.refresh_from_db()
    assert inst.paid_amount == Decimal("0.00")
    assert financing.status == ElectiveProcedureFinancing.Status.ACTIVE


@pytest.mark.django_db
def test_reject_financing_requires_reason():
    tenant = _tenant()
    financing = _financing(tenant, _patient(tenant))
    with pytest.raises(ValidationError):
        CreditFinancingWorkflowService.reject_financing(financing, reason="")
    CreditFinancingWorkflowService.reject_financing(financing, reason="Risco elevado")
    assert financing.status == ElectiveProcedureFinancing.Status.CANCELLED


@pytest.mark.django_db
def test_consortium_lifecycle():
    tenant = _tenant()
    patient = _patient(tenant)
    consortium = HealthConsortium.objects.create(
        tenant=tenant, patient=patient,
        consortium_type=HealthConsortium.ConsortiumType.PROCEDURE_PACKAGE,
        target_amount=Decimal("10000.00"), contribution_amount=Decimal("500.00"), term_months=20,
    )
    CreditFinancingWorkflowService.activate_consortium(consortium)
    assert consortium.status == HealthConsortium.Status.ACTIVE
    CreditFinancingWorkflowService.award_consortium(consortium)
    assert consortium.status == HealthConsortium.Status.AWARDED
    assert consortium.awarded_at is not None
    CreditFinancingWorkflowService.complete_consortium(consortium)
    assert consortium.status == HealthConsortium.Status.COMPLETED


@pytest.mark.django_db
def test_reimbursement_approve_partial_glossed_and_received():
    tenant = _tenant()
    patient = _patient(tenant)
    claim = ReimbursementClaim.objects.create(
        tenant=tenant, patient=patient,
        claim_type=ReimbursementClaim.ClaimType.INSURANCE,
        claimed_amount=Decimal("1000.00"), approved_amount=Decimal("1000.00"),
    )
    # Aprovação parcial → o modelo marca como GLOSADO (glosa de 300); exige motivo.
    with pytest.raises(ValidationError):
        CreditFinancingWorkflowService.approve_claim(claim, approved_amount="700.00")
    CreditFinancingWorkflowService.approve_claim(claim, approved_amount="700.00", glosa_reason="Fora de cobertura")
    assert claim.approved_amount == Decimal("700.00")
    assert claim.denied_amount == Decimal("300.00")
    assert claim.status == ReimbursementClaim.Status.GLOSSED

    with pytest.raises(ValidationError):
        CreditFinancingWorkflowService.register_reimbursement(claim, amount="9999.00")  # excede aprovado

    CreditFinancingWorkflowService.register_reimbursement(claim, amount="700.00")
    assert claim.status == ReimbursementClaim.Status.PAID
    assert claim.balance_to_receive == Decimal("0.00")


@pytest.mark.django_db
def test_financing_with_interest_amortizes():
    tenant = _tenant()
    financing = _financing(tenant, _patient(tenant), principal="12000.00", term=12, rate="24.00")
    # Com juro a parcela é maior que principal/term (1000).
    assert financing.installment_amount > Decimal("1000.00")
    CreditFinancingWorkflowService.approve_financing(financing)
    assert financing.installments.count() == 12
