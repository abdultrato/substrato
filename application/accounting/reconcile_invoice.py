from decimal import (
    ROUND_HALF_UP,
    Decimal,
)

from django.db import transaction

from apps.accounting.models.account_balance import AccountBalance
from apps.accounting.models.financial_reconciliation import FinancialReconciliation


@transaction.atomic
def execute(
    invoice,
    received_amount,
    external_reference=None,
):

    received_amount = Decimal(
        received_amount,
    ).quantize(
        Decimal(
            "0.01",
        ),
        rounding=ROUND_HALF_UP,
    )

    # 🔐 Lock pessimista no saldo
    saldo = AccountBalance.objects.select_for_update().get(
        account=invoice.account_recebivel,
    )

    accounting_value = saldo.current_balance.quantize(
        Decimal(
            "0.01",
        ),
        rounding=ROUND_HALF_UP,
    )

    discrepancy = (accounting_value - received_amount).quantize(
        Decimal(
            "0.01",
        ),
        rounding=ROUND_HALF_UP,
    )

    reconciled = discrepancy == Decimal(
        "0.00",
    )

    return FinancialReconciliation.objects.create(
        tenant=invoice.tenant,
        invoice=invoice,
        accounting_value=accounting_value,
        received_amount=received_amount,
        discrepancy=discrepancy,
        reconciled=reconciled,
        external_reference=external_reference,
    )


