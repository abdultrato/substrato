from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction

from apps.accounting.models import LegacyEntry, LegacyMovement


@transaction.atomic
def registrar_lancamento(descricao: str, movimentos: list[dict]):
    lancamento = LegacyEntry.objects.create(descricao=descricao)

    total_debito = Decimal("0.00")
    total_credito = Decimal("0.00")

    for mov in movimentos:
        debito = Decimal(mov.get("debito", 0))
        credito = Decimal(mov.get("credito", 0))

        total_debito += debito
        total_credito += credito

        LegacyMovement.objects.create(
            lancamento=lancamento,
            conta=mov["conta"],
            debito=debito,
            credito=credito,
        )

    if total_debito != total_credito:
        raise ValidationError("Lançamento contábil desbalanceado.")

    return lancamento
