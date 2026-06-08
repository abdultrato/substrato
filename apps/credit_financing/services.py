from __future__ import annotations

import calendar
from datetime import date
from decimal import Decimal, InvalidOperation

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.credit_financing.models import (
    CreditInstallment,
    ElectiveProcedureFinancing,
    HealthConsortium,
    ReimbursementClaim,
    StudentFunding,
    _money,
)

ZERO = Decimal("0.00")


def _to_money(value, *, field="amount") -> Decimal:
    try:
        return _money(Decimal(str(value)))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValidationError({field: "Valor monetário inválido."}) from exc


def _add_months(start: date, months: int) -> date:
    index = start.month - 1 + months
    year = start.year + index // 12
    month = index % 12 + 1
    day = min(start.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def _append(current: str, label: str, text: str) -> str:
    if not text:
        return current
    return f"{current}\n[{label}] {text}".strip()


class CreditFinancingWorkflowService:
    """Casos de uso de créditos e financiamento (§9.12): solicitar → analisar → aprovar → parcelar → receber."""

    # ------------------------------------------------------------------ #
    # Consórcio de saúde
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def activate_consortium(consortium: HealthConsortium) -> HealthConsortium:
        if consortium.status != HealthConsortium.Status.DRAFT:
            raise ValidationError("Apenas consórcios em rascunho podem ser ativados.")
        consortium.status = HealthConsortium.Status.ACTIVE
        consortium.save()
        return consortium

    @staticmethod
    @transaction.atomic
    def award_consortium(consortium: HealthConsortium, *, awarded_at=None) -> HealthConsortium:
        if consortium.status != HealthConsortium.Status.ACTIVE:
            raise ValidationError("Apenas consórcios ativos podem ser contemplados.")
        consortium.status = HealthConsortium.Status.AWARDED
        consortium.awarded_at = awarded_at or timezone.localdate()
        consortium.save()
        return consortium

    @staticmethod
    @transaction.atomic
    def complete_consortium(consortium: HealthConsortium) -> HealthConsortium:
        if consortium.status not in {HealthConsortium.Status.ACTIVE, HealthConsortium.Status.AWARDED}:
            raise ValidationError("Apenas consórcios ativos/contemplados podem ser concluídos.")
        consortium.status = HealthConsortium.Status.COMPLETED
        consortium.save()
        return consortium

    @staticmethod
    @transaction.atomic
    def cancel_consortium(consortium: HealthConsortium, *, reason: str = "") -> HealthConsortium:
        if consortium.status == HealthConsortium.Status.COMPLETED:
            raise ValidationError("Um consórcio concluído não pode ser cancelado.")
        if not reason.strip():
            raise ValidationError({"reason": "Informe o motivo do cancelamento."})
        consortium.status = HealthConsortium.Status.CANCELLED
        consortium.notes = _append(consortium.notes, "Cancelamento", reason)
        consortium.save()
        return consortium

    # ------------------------------------------------------------------ #
    # Financiamento de procedimento
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def analyze_financing(
        financing: ElectiveProcedureFinancing, *, risk_rating: str | None = None
    ) -> ElectiveProcedureFinancing:
        if financing.status != ElectiveProcedureFinancing.Status.APPLICATION:
            raise ValidationError("Apenas financiamentos em análise podem ser avaliados.")
        if risk_rating:
            financing.risk_rating = risk_rating
        financing.save()
        return financing

    @staticmethod
    @transaction.atomic
    def generate_installments(
        financing: ElectiveProcedureFinancing, *, first_due_date=None, periodicity_months: int = 1
    ) -> list[CreditInstallment]:
        if financing.installments.exists():
            raise ValidationError("As parcelas deste financiamento já foram geradas.")
        term = max(int(financing.term_months or 1), 1)
        total_each = _money(financing.installment_amount)
        principal_each = _money(financing.financed_amount / Decimal(term))
        interest_each = _money(max(total_each - principal_each, ZERO))
        first = first_due_date or financing.first_due_date or _add_months(financing.start_date, 1)

        installments: list[CreditInstallment] = []
        for index in range(term):
            due = _add_months(first, index * max(periodicity_months, 1))
            installments.append(
                CreditInstallment.objects.create(
                    tenant=financing.tenant,
                    procedure_financing=financing,
                    installment_number=index + 1,
                    due_date=due,
                    principal_amount=principal_each,
                    interest_amount=interest_each,
                    total_amount=total_each,
                )
            )
        return installments

    @staticmethod
    @transaction.atomic
    def approve_financing(
        financing: ElectiveProcedureFinancing,
        *,
        approval_reference: str = "",
        first_due_date=None,
        periodicity_months: int = 1,
    ) -> ElectiveProcedureFinancing:
        """Aprova o financiamento, gera o calendário de parcelas e ativa o contrato (§9.12)."""
        if financing.status not in {
            ElectiveProcedureFinancing.Status.APPLICATION,
            ElectiveProcedureFinancing.Status.APPROVED,
        }:
            raise ValidationError("Apenas financiamentos em análise podem ser aprovados.")
        if approval_reference:
            financing.approval_reference = approval_reference
        financing.status = ElectiveProcedureFinancing.Status.APPROVED
        financing.save()
        if not financing.installments.exists():
            CreditFinancingWorkflowService.generate_installments(
                financing, first_due_date=first_due_date, periodicity_months=periodicity_months
            )
        financing.status = ElectiveProcedureFinancing.Status.ACTIVE
        financing.save()
        return financing

    @staticmethod
    @transaction.atomic
    def reject_financing(financing: ElectiveProcedureFinancing, *, reason: str = "") -> ElectiveProcedureFinancing:
        if financing.status not in {
            ElectiveProcedureFinancing.Status.APPLICATION,
            ElectiveProcedureFinancing.Status.APPROVED,
        }:
            raise ValidationError("Apenas financiamentos em análise podem ser rejeitados.")
        if not reason.strip():
            raise ValidationError({"reason": "Informe o motivo da rejeição."})
        financing.status = ElectiveProcedureFinancing.Status.CANCELLED
        financing.notes = _append(financing.notes, "Rejeição", reason)
        financing.save()
        return financing

    @staticmethod
    @transaction.atomic
    def cancel_financing(financing: ElectiveProcedureFinancing, *, reason: str = "") -> ElectiveProcedureFinancing:
        if financing.status == ElectiveProcedureFinancing.Status.PAID:
            raise ValidationError("Um financiamento liquidado não pode ser cancelado.")
        if not reason.strip():
            raise ValidationError({"reason": "Informe o motivo do cancelamento."})
        financing.status = ElectiveProcedureFinancing.Status.CANCELLED
        financing.notes = _append(financing.notes, "Cancelamento", reason)
        financing.save()
        for installment in financing.installments.filter(
            status__in=[
                CreditInstallment.Status.SCHEDULED,
                CreditInstallment.Status.OVERDUE,
                CreditInstallment.Status.PARTIAL,
            ]
        ):
            installment.status = CreditInstallment.Status.CANCELLED
            installment.save()
        return financing

    # ------------------------------------------------------------------ #
    # Parcelas
    # ------------------------------------------------------------------ #
    @staticmethod
    def _settle_financing_if_paid(financing: ElectiveProcedureFinancing) -> None:
        if financing is None:
            return
        outstanding = financing.installments.exclude(
            status__in=[
                CreditInstallment.Status.PAID,
                CreditInstallment.Status.WAIVED,
                CreditInstallment.Status.CANCELLED,
            ]
        )
        if not outstanding.exists() and financing.status not in {
            ElectiveProcedureFinancing.Status.PAID,
            ElectiveProcedureFinancing.Status.CANCELLED,
        }:
            financing.status = ElectiveProcedureFinancing.Status.PAID
            financing.save()

    @staticmethod
    @transaction.atomic
    def pay_installment(installment: CreditInstallment, *, amount, payment=None) -> CreditInstallment:
        if installment.status in {
            CreditInstallment.Status.PAID,
            CreditInstallment.Status.WAIVED,
            CreditInstallment.Status.CANCELLED,
        }:
            raise ValidationError("Parcela já encerrada.")
        amount = _to_money(amount)
        if amount <= ZERO:
            raise ValidationError({"amount": "O valor pago deve ser positivo."})
        new_paid = _money(installment.paid_amount + amount)
        if new_paid > installment.total_amount:
            raise ValidationError({"amount": "O pagamento excede o saldo da parcela."})
        installment.paid_amount = new_paid
        if payment is not None:
            installment.payment = payment
        installment.save()  # save() do modelo define PAID/PARTIAL e paid_at
        CreditFinancingWorkflowService._settle_financing_if_paid(installment.procedure_financing)
        return installment

    @staticmethod
    @transaction.atomic
    def apply_late_fee(installment: CreditInstallment, *, fee_amount=ZERO, interest_amount=ZERO) -> CreditInstallment:
        if installment.status in {
            CreditInstallment.Status.PAID,
            CreditInstallment.Status.WAIVED,
            CreditInstallment.Status.CANCELLED,
        }:
            raise ValidationError("Não é possível aplicar encargos numa parcela encerrada.")
        fee = _to_money(fee_amount, field="fee_amount")
        interest = _to_money(interest_amount, field="interest_amount")
        if fee <= ZERO and interest <= ZERO:
            raise ValidationError({"fee_amount": "Informe multa ou juros a aplicar."})
        installment.fee_amount = _money(installment.fee_amount + fee)
        installment.interest_amount = _money(installment.interest_amount + interest)
        installment.total_amount = _money(
            installment.principal_amount + installment.interest_amount + installment.fee_amount
        )
        installment.save()
        return installment

    @staticmethod
    @transaction.atomic
    def waive_installment(installment: CreditInstallment, *, reason: str = "") -> CreditInstallment:
        if installment.status == CreditInstallment.Status.PAID:
            raise ValidationError("Uma parcela paga não pode ser perdoada.")
        installment.status = CreditInstallment.Status.WAIVED
        installment.notes = _append(installment.notes, "Perdão", reason)
        installment.save()
        CreditFinancingWorkflowService._settle_financing_if_paid(installment.procedure_financing)
        return installment

    @staticmethod
    @transaction.atomic
    def reverse_payment(installment: CreditInstallment, *, reason: str = "") -> CreditInstallment:
        if installment.paid_amount <= ZERO:
            raise ValidationError("Não há pagamento para estornar nesta parcela.")
        if not reason.strip():
            raise ValidationError({"reason": "Informe o motivo do estorno."})
        installment.paid_amount = ZERO
        installment.paid_at = None
        installment.payment = None
        installment.status = CreditInstallment.Status.SCHEDULED
        installment.notes = _append(installment.notes, "Estorno", reason)
        installment.save()  # save() reavalia OVERDUE conforme vencimento
        financing = installment.procedure_financing
        if financing is not None and financing.status == ElectiveProcedureFinancing.Status.PAID:
            financing.status = ElectiveProcedureFinancing.Status.ACTIVE
            financing.save()
        return installment

    # ------------------------------------------------------------------ #
    # Convénios e reembolsos
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def approve_claim(claim: ReimbursementClaim, *, approved_amount, glosa_reason: str = "") -> ReimbursementClaim:
        if claim.status in {
            ReimbursementClaim.Status.PAID,
            ReimbursementClaim.Status.CANCELLED,
            ReimbursementClaim.Status.REJECTED,
        }:
            raise ValidationError("Pedido encerrado não pode ser aprovado.")
        approved = _to_money(approved_amount, field="approved_amount")
        if approved > claim.claimed_amount:
            raise ValidationError({"approved_amount": "O valor aprovado não pode exceder o valor reclamado."})
        if approved < claim.claimed_amount and not (glosa_reason or claim.glosa_reason).strip():
            raise ValidationError({"glosa_reason": "Aprovação parcial (glosa) exige o motivo da glosa."})
        claim.approved_amount = approved
        if glosa_reason:
            claim.glosa_reason = glosa_reason
        claim.decision_at = timezone.now()
        # save() do modelo marca GLOSSED quando há glosa parcial.
        claim.status = ReimbursementClaim.Status.APPROVED
        claim.save()
        return claim

    @staticmethod
    @transaction.atomic
    def reject_claim(claim: ReimbursementClaim, *, reason: str = "") -> ReimbursementClaim:
        if claim.status in {ReimbursementClaim.Status.PAID, ReimbursementClaim.Status.CANCELLED}:
            raise ValidationError("Pedido encerrado não pode ser rejeitado.")
        if not reason.strip():
            raise ValidationError({"reason": "Informe o motivo da rejeição."})
        claim.status = ReimbursementClaim.Status.REJECTED
        claim.decision_at = timezone.now()
        claim.notes = _append(claim.notes, "Rejeição", reason)
        claim.save()
        return claim

    @staticmethod
    @transaction.atomic
    def register_reimbursement(claim: ReimbursementClaim, *, amount) -> ReimbursementClaim:
        if claim.status not in {
            ReimbursementClaim.Status.APPROVED,
            ReimbursementClaim.Status.GLOSSED,
            ReimbursementClaim.Status.PAID,
        }:
            raise ValidationError("Apenas pedidos aprovados podem receber reembolso.")
        amount = _to_money(amount)
        if amount <= ZERO:
            raise ValidationError({"amount": "O valor reembolsado deve ser positivo."})
        new_total = _money(claim.reimbursed_amount + amount)
        if new_total > claim.approved_amount:
            raise ValidationError({"amount": "O reembolso excede o valor aprovado."})
        claim.reimbursed_amount = new_total
        if new_total >= claim.approved_amount and claim.approved_amount > ZERO:
            claim.status = ReimbursementClaim.Status.PAID
        claim.save()
        return claim

    # ------------------------------------------------------------------ #
    # Bolsas / financiamento estudantil
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def approve_funding(funding: StudentFunding, *, approval_reference: str = "") -> StudentFunding:
        if funding.status not in {StudentFunding.Status.APPLICATION, StudentFunding.Status.APPROVED}:
            raise ValidationError("Apenas candidaturas em análise podem ser aprovadas.")
        if approval_reference:
            funding.approval_reference = approval_reference
        funding.status = StudentFunding.Status.ACTIVE
        funding.save()
        return funding

    @staticmethod
    @transaction.atomic
    def suspend_funding(funding: StudentFunding, *, reason: str = "") -> StudentFunding:
        if funding.status != StudentFunding.Status.ACTIVE:
            raise ValidationError("Apenas apoios ativos podem ser suspensos.")
        funding.status = StudentFunding.Status.SUSPENDED
        funding.notes = _append(funding.notes, "Suspensão", reason)
        funding.save()
        return funding

    @staticmethod
    @transaction.atomic
    def revoke_funding(funding: StudentFunding, *, reason: str = "") -> StudentFunding:
        if funding.status in {StudentFunding.Status.COMPLETED, StudentFunding.Status.CANCELLED}:
            raise ValidationError("Apoio encerrado não pode ser revogado.")
        if not reason.strip():
            raise ValidationError({"reason": "Informe o motivo da revogação."})
        funding.status = StudentFunding.Status.CANCELLED
        funding.notes = _append(funding.notes, "Revogação", reason)
        funding.save()
        return funding
