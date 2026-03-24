from django.db.models import F, Sum
from django.db.models.functions import Coalesce

from apps.accounting.models.legacy_movement import LegacyMovement


class LedgerService:
    @staticmethod
    def balance_by_account(tenant, start_date=None, end_date=None):
        query = LegacyMovement.objects.filter(
            lancamento__confirmado=True,
            inquilino=tenant,
        )

        if start_date:
            query = query.filter(lancamento__data__gte=start_date)

        if end_date:
            query = query.filter(lancamento__data__lte=end_date)

        return (
            query.values("conta__id", "conta__nome", "conta__id_custom")
            .annotate(
                total_debito=Coalesce(Sum("debito"), 0),
                total_credito=Coalesce(Sum("credito"), 0),
            )
            .annotate(saldo=F("total_debito") - F("total_credito"))
            .order_by("conta__id_custom")
        )


RazaoService = LedgerService
LedgerService.saldo_por_conta = LedgerService.balance_by_account
