from decimal import Decimal

from django.db.models import F, Sum
from django.db.models.functions import Coalesce

from apps.billing.models.invoice import Invoice

# ==========================================================
# RESUMO FINANCEIRO
# ==========================================================


def resumo_financeiro_periodo(data_inicio, data_fim):
    """
    Resumo financeiro consolidado por período.
    """

    faturas = Invoice.objects.filter(
        criado_em__date__gte=data_inicio,
        criado_em__date__lte=data_fim,
        deletado=False,
        estado__in=[
            Invoice.Estado.EMITIDA,
            Invoice.Estado.PAGA,
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
        Invoice.objects.filter(deletado=False)
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

    return Invoice.objects.filter(
        deletado=False,
        ativo=True,
        estado=Invoice.Estado.EMITIDA,
        valor_paciente__gt=Decimal("0.00"),
    )
