from decimal import Decimal

from django.db.models import Sum

from frontend.billing.models.fatura import Fatura


def resumo_financeiro_periodo(data_inicio, data_fim):
    """
    Retorna resumo financeiro consolidado no período.
    """

    faturas = Fatura.objects.filter(
        criado_em__date__gte=data_inicio,
        criado_em__date__lte=data_fim,
        deletado=False,
    )

    totais = faturas.aggregate(
        subtotal=Sum("subtotal"),
        iva=Sum("iva_valor"),
        total=Sum("total"),
        pago=Sum("valor_paciente") + Sum("valor_seguro"),
    )

    return {
        "subtotal": totais["subtotal"] or Decimal("0.00"),
        "iva": totais["iva"] or Decimal("0.00"),
        "total": totais["total"] or Decimal("0.00"),
        "recebido": totais["pago"] or Decimal("0.00"),
        "quantidade_faturas": faturas.count(),
    }


def faturamento_por_estado():
    """
    Agrupa faturamento por estado da fatura.
    """

    dados = Fatura.objects.filter(deletado=False).values("estado").annotate(total=Sum("total")).order_by("estado")

    return list(dados)


def faturas_em_aberto():
    """
    Retorna faturas com saldo pendente.
    """

    abertas = Fatura.objects.filter(
        deletado=False,
        ativo=True,
    )

    return [f for f in abertas if f.saldo_pendente > Decimal("0.00")]
