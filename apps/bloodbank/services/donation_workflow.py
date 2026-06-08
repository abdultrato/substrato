"""Casos de uso da jornada da doação: triagem → colheita (§15.6 / §15.7).

A máquina de estados (REGISTERED→SCREENING→COMPLETED/CANCELED) e a criação
automática de unidades ao concluir vivem no modelo; este serviço orquestra as
transições com os guards clínicos (triagem aprovada antes da colheita).
"""

from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import transaction

from apps.bloodbank.models.blood_bank import BloodDonation

_DStatus = BloodDonation.DonationStatus
_SStatus = BloodDonation.ScreeningStatus
_TERMINAL = {_DStatus.COMPLETED, _DStatus.CANCELED}


def _append(current: str, label: str, text: str) -> str:
    if not text:
        return current
    return f"{current}\n[{label}] {text}".strip()


class BloodDonationWorkflowService:
    """Doador → triagem → colheita; a colheita concluída gera a(s) unidade(s)."""

    @staticmethod
    @transaction.atomic
    def start_screening(donation: BloodDonation) -> BloodDonation:
        if donation.status != _DStatus.REGISTERED:
            raise ValidationError("Apenas doações registradas podem entrar em triagem.")
        donation.status = _DStatus.SCREENING
        donation.save()
        return donation

    @staticmethod
    @transaction.atomic
    def approve_screening(donation: BloodDonation) -> BloodDonation:
        """Aprova a triagem (o modelo exige testes NEGATIVOS + peso + hemoglobina)."""
        if donation.status in _TERMINAL:
            raise ValidationError("Doação encerrada não pode ser triada.")
        if donation.status == _DStatus.REGISTERED:
            donation.status = _DStatus.SCREENING
        donation.screening_status = _SStatus.APPROVED
        donation.save()
        return donation

    @staticmethod
    @transaction.atomic
    def reject_screening(donation: BloodDonation, *, reason: str = "") -> BloodDonation:
        if donation.status in _TERMINAL:
            raise ValidationError("Doação encerrada não pode ser triada.")
        if donation.status == _DStatus.REGISTERED:
            donation.status = _DStatus.SCREENING
        donation.screening_status = _SStatus.REJECTED
        donation.notes = _append(donation.notes, "Triagem reprovada", reason)
        donation.save()
        return donation

    @staticmethod
    @transaction.atomic
    def complete_collection(donation: BloodDonation) -> BloodDonation:
        """Conclui a colheita (gera a unidade). Só com triagem aprovada (§15.7)."""
        if donation.status == _DStatus.COMPLETED:
            raise ValidationError("Doação já concluída.")
        if donation.status == _DStatus.CANCELED:
            raise ValidationError("Doação cancelada não pode ser concluída.")
        if donation.screening_status != _SStatus.APPROVED:
            raise ValidationError("A colheita só pode ser concluída com triagem aprovada.")
        donation.status = _DStatus.COMPLETED
        donation.save()  # save() cria a(s) unidade(s) em quarentena/disponível conforme os testes
        return donation

    @staticmethod
    @transaction.atomic
    def cancel(donation: BloodDonation, *, reason: str = "") -> BloodDonation:
        if donation.status in _TERMINAL:
            raise ValidationError("Doação concluída/cancelada não pode ser cancelada.")
        donation.status = _DStatus.CANCELED
        donation.notes = _append(donation.notes, "Cancelamento", reason)
        donation.save()
        return donation
