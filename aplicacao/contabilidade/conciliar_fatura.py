from decimal import (
    Decimal,
    ROUND_HALF_UP,
)

from django.db import transaction

from aplicativos.contabilidade.modelos.conciliacao import ConciliacaoFinanceira
from aplicativos.contabilidade.modelos.saldo_conta import SaldoConta


@transaction.atomic
def executar(
    fatura,
    valor_recebido,
    referencia_externa=None,
):

    valor_recebido = Decimal(
        valor_recebido,
    ).quantize(
        Decimal(
            "0.01",
        ),
        rounding=ROUND_HALF_UP,
    )

    # 🔐 Lock pessimista no saldo
    saldo = SaldoConta.objects.select_for_update().get(
        conta=fatura.conta_recebivel,
    )

    valor_contabil = saldo.saldo_atual.quantize(
        Decimal(
            "0.01",
        ),
        rounding=ROUND_HALF_UP,
    )

    divergencia = (valor_contabil - valor_recebido).quantize(
        Decimal(
            "0.01",
        ),
        rounding=ROUND_HALF_UP,
    )

    conciliado = divergencia == Decimal(
        "0.00",
    )

    return ConciliacaoFinanceira.objects.create(
        inquilino=fatura.inquilino,
        fatura=fatura,
        valor_contabil=valor_contabil,
        valor_recebido=valor_recebido,
        divergencia=divergencia,
        conciliado=conciliado,
        referencia_externa=referencia_externa,
    )
