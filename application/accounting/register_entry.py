from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction

from apps.accounting.models import LegacyEntry, LegacyMovement


@transaction.atomic
def register_entry(description: str, movimentos: list[dict]):
    entry = LegacyEntry.objects.create(description=description)

    total_debit = Decimal("0.00")
    total_credit = Decimal("0.00")

    for mov in movimentos:
        debit = Decimal(mov.get("debit", 0))
        credit = Decimal(mov.get("credit", 0))

        total_debit += debit
        total_credit += credit

        LegacyMovement.objects.create(
            entry=entry,
            account=mov["account"],
            debit=debit,
            credit=credit,
        )

    if total_debit != total_credit:
        raise ValidationError("Lançamento contábil desbalanceado.")

    return entry
