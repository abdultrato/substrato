from django.db.models import F, Sum
from django.db.models.functions import Coalesce

from apps.accounting.models.legacy_movement import LegacyMovement


class LedgerService:
    @staticmethod
    def balance_by_account(tenant, start_date=None, end_date=None):
        query = LegacyMovement.objects.filter(
            entry__confirmed=True,
            tenant=tenant,
        )

        if start_date:
            query = query.filter(entry__date__gte=start_date)

        if end_date:
            query = query.filter(entry__date__lte=end_date)

        return (
            query.values("account__id", "account__name", "account__custom_id")
            .annotate(
                total_debit=Coalesce(Sum("debit"), 0),
                total_credit=Coalesce(Sum("credit"), 0),
            )
            .annotate(saldo=F("total_debit") - F("total_credit"))
            .order_by("account__custom_id")
        )


RazaoService = LedgerService
LedgerService.saldo_por_account = LedgerService.balance_by_account
