from decimal import Decimal

from django.db.models import F, Sum
from django.db.models.functions import Coalesce

from aplicativos.faturamento.modelos.fatura import Fatura

# ==========================================================
# RESUMO FINANCEIRO
# ==========================================================


def resumo_financeiro_periodo(data_inicio, data_fim):
    """
    Resumo financeiro consolidado por período.
    """

    faturas = Fatura.objects.filter(
        criado_em__date__gte=data_inicio,
        criado_em__date__lte=data_fim,
        deletado=False,
        estado__in=[
            Fatura.Estado.EMITIDA,
            Fatura.Estado.PAGA,
        ],
    )

    totais = faturas.aggregate(
        subtotal=Coalesce(Sum("subtotal"), Decimal("0.00")),
        iva=Coalesce(Sum("iva_valor"), Decimal("0.00")),
        total=Coalesce(Sum("total"), Decimal("0.00")),
        recebido=Coalesce(
            Sum(F("valor_paciente") + F("valor_seguro")),
            Decimal("0.00"),
        ),
    )

    return {
        "subtotal": totais["subtotal"],
        "iva": totais["iva"],
        "total": totais["total"],
        "recebido": totais["recebido"],
        "quantidade_faturas": faturas.count(),
    }


# ==========================================================
# FATURAMENTO POR ESTADO
# ==========================================================


def faturamento_por_estado():
    """
    Agrupa faturamento por estado.
    """

    dados = (
        Fatura.objects.filter(deletado=False)
        .values("estado")
        .annotate(total=Coalesce(Sum("total"), Decimal("0.00")))
        .order_by("estado")
    )

    return list(dados)


# ==========================================================
# FATURAS EM ABERTO
# ==========================================================


def faturas_em_aberto():
    """
    Retorna faturas com saldo pendente.
    """

    return Fatura.objects.filter(
        deletado=False,
        ativo=True,
        estado=Fatura.Estado.EMITIDA,
        valor_paciente__gt=Decimal("0.00"),
    )
