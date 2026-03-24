from decimal import Decimal

from django.db import transaction
from django.db.models import F

from apps.accounting.models.account_balance import AccountBalance
from events.accounting.ledger_entry_created import LedgerEntryCreated


@transaction.atomic
def handle(event: LedgerEntryCreated):
    account_totals = {}

    for line in event.linhas:
        account_id = line.conta_id
        amount = Decimal(line.valor)

        if account_id not in account_totals:
            account_totals[account_id] = {
                "debito": Decimal("0.00"),
                "credito": Decimal("0.00"),
            }

        if line.natureza == "D":
            account_totals[account_id]["debito"] += amount
        else:
            account_totals[account_id]["credito"] += amount

    balances = AccountBalance.objects.select_for_update().filter(conta_id__in=account_totals.keys())
    balances_by_account = {balance.conta_id: balance for balance in balances}

    for account_id in account_totals:
        if account_id not in balances_by_account:
            AccountBalance.objects.create(
                conta_id=account_id,
                saldo_atual=0,
            )

    for account_id, amounts in account_totals.items():
        AccountBalance.objects.filter(conta_id=account_id).update(
            saldo_atual=F("saldo_atual") + amounts["debito"] - amounts["credito"],
        )
