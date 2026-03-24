from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction

from apps.accounting.models.legacy_entry import LegacyEntry
from apps.accounting.models.legacy_movement import LegacyMovement


class AccountingService:
    @staticmethod
    @transaction.atomic
    def create_entry(
        *,
        description: str,
        data=None,
        accounting_date=None,
        movements: list,
        external_reference: str = "",
        tenant=None,
    ):
        if len(movements) < 2:
            raise ValidationError("Accounting entries require at least two movements.")

        entry_date = data or accounting_date
        if not entry_date:
            raise ValidationError("Entry date is required.")

        entry = LegacyEntry.objects.create(
            nome=(description or "Accounting Entry")[:120],
            descricao=description,
            data=entry_date,
            referencia_externa=external_reference,
            inquilino=tenant,
        )

        total_debit = Decimal("0.00")
        total_credit = Decimal("0.00")

        for index, movement in enumerate(movements, start=1):
            account = movement["conta"]
            debit = movement.get("debito", Decimal("0.00"))
            credit = movement.get("credito", Decimal("0.00"))

            LegacyMovement.objects.create(
                nome=f"Line {index} - {getattr(account, 'nome', account)}"[:120],
                lancamento=entry,
                conta=account,
                debito=debit,
                credito=credit,
                inquilino=tenant,
            )

            total_debit += debit
            total_credit += credit

        if total_debit != total_credit:
            raise ValidationError("Unbalanced accounting entry.")

        entry.confirmado = True
        entry.save(update_fields=["confirmado"])

        return entry


ServicoContabilidade = AccountingService
AccountingService.criar_lancamento = AccountingService.create_entry
