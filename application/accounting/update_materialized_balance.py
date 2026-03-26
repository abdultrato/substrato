from decimal import Decimal

from django.db import transaction
from django.db.models import Case, DecimalField, Sum, Value, When

from apps.accounting.models.account_balance import AccountBalance
from apps.accounting.models.ledger_line import LedgerLine


@transaction.atomic
def execute(account):
    totals = LedgerLine.objects.filter(account=account).aggregate(
        debit=Sum(
            Case(
                When(nature="D", then="value"),
                default=Value(Decimal("0.00")),
                output_field=DecimalField(max_digits=18, decimal_places=2),
            )
        ),
        credit=Sum(
            Case(
                When(nature="C", then="value"),
                default=Value(Decimal("0.00")),
                output_field=DecimalField(max_digits=18, decimal_places=2),
            )
        ),
    )
    current_balance = (totals["debit"] or Decimal("0.00")) - (totals["credit"] or Decimal("0.00"))
    balance, _ = AccountBalance.objects.get_or_create(account=account, defaults={"current_balance": Decimal("0.00")})
    balance.current_balance = current_balance
    balance.save()
    return balance


update_materialized_balance = execute
