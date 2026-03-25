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
        date=None,
        accounting_date=None,
        movements: list,
        external_reference: str = "",
        tenant=None,
    ):
        if len(movements) < 2:
            raise ValidationError("Accounting entries require at least two movements.")

        entry_date = date or accounting_date
        if not entry_date:
            raise ValidationError("Entry date is required.")

        entry = LegacyEntry.objects.create(
            name=(description or "Accounting Entry")[:120],
            description=description,
            date=entry_date,
            external_reference=external_reference,
            tenant=tenant,
        )

        total_debit = Decimal("0.00")
        total_credit = Decimal("0.00")

        for index, movement in enumerate(movements, start=1):
            account = movement["account"]
            debit = movement.get("debit", Decimal("0.00"))
            credit = movement.get("credit", Decimal("0.00"))

            LegacyMovement.objects.create(
                name=f"Line {index} - {getattr(account, 'name', account)}"[:120],
                entry=entry,
                account=account,
                debit=debit,
                credit=credit,
                tenant=tenant,
            )

            total_debit += debit
            total_credit += credit

        if total_debit != total_credit:
            raise ValidationError("Unbalanced accounting entry.")

        entry.confirmed = True
        entry.save(update_fields=["confirmed"])

        return entry


