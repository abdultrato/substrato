from decimal import (
    ROUND_HALF_UP,
    Decimal,
)

from django.db import transaction

from apps.accounting.models.account_balance import AccountBalance
from apps.accounting.models.financial_reconciliation import FinancialReconciliation


@transaction.atomic
def execute(
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
    saldo = AccountBalance.objects.select_for_update().get(
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

    return FinancialReconciliation.objects.create(
        inquilino=fatura.inquilino,
        fatura=fatura,
        valor_contabil=valor_contabil,
        valor_recebido=valor_recebido,
        divergencia=divergencia,
        conciliado=conciliado,
        referencia_externa=referencia_externa,
    )


executar = execute
