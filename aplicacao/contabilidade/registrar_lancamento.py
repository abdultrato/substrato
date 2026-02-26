from decimal import Decimal
from django.db import transaction
from django.core.exceptions import ValidationError

from aplicativos.contabilidade.modelos import Lancamento, Movimento


@transaction.atomic
def registrar_lancamento(descricao: str, movimentos: list[dict]):
    lancamento = Lancamento.objects.create(descricao=descricao)

    total_debito = Decimal("0.00")
    total_credito = Decimal("0.00")

    for mov in movimentos:
        debito = Decimal(mov.get("debito", 0))
        credito = Decimal(mov.get("credito", 0))

        total_debito += debito
        total_credito += credito

        Movimento.objects.create(
            lancamento=lancamento,
            conta=mov["conta"],
            debito=debito,
            credito=credito,
        )

    if total_debito != total_credito:
        raise ValidationError("Lançamento contábil desbalanceado.")

    return lancamento
