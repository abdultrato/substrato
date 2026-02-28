# servicos/relatorios/razao.py

from django.db.models import Sum, F, DecimalField
from django.db.models.functions import Coalesce

from aplicativos.contabilidade.modelos.movimento import Movimento


class RazaoService:

    @staticmethod
    def saldo_por_conta(inquilino, data_inicio=None, data_fim=None):

        queryset = Movimento.objects.filter(
            lancamento__confirmado=True,
            inquilino=inquilino,
        )

        if data_inicio:
            queryset = queryset.filter(lancamento__data__gte=data_inicio)

        if data_fim:
            queryset = queryset.filter(lancamento__data__lte=data_fim)

        return (
            queryset
            .values("conta__id", "conta__nome", "conta__id_custom")
            .annotate(
                total_debito=Coalesce(Sum("debito"), 0),
                total_credito=Coalesce(Sum("credito"), 0),
            )
            .annotate(
                saldo=F("total_debito") - F("total_credito")
            )
            .order_by("conta__id_custom")
        )
