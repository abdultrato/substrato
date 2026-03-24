from decimal import Decimal

from django.db.models import F, Sum
from django.db.models.functions import Coalesce

from apps.billing.models.invoice import Invoice


def financial_summary_by_period(start_date, end_date):
    """
    Consolidated financial summary for the given date range.
    """

    invoices = Invoice.objects.filter(
        criado_em__date__gte=start_date,
        criado_em__date__lte=end_date,
        deletado=False,
        estado__in=[
            Invoice.Estado.EMITIDA,
            Invoice.Estado.PAGA,
        ],
    )

    totals = invoices.aggregate(
        subtotal=Coalesce(Sum("subtotal"), Decimal("0.00")),
        iva=Coalesce(Sum("iva_valor"), Decimal("0.00")),
        total=Coalesce(Sum("total"), Decimal("0.00")),
        recebido=Coalesce(
            Sum(F("valor_paciente") + F("valor_seguro")),
            Decimal("0.00"),
        ),
    )

    return {
        "subtotal": totals["subtotal"],
        "iva": totals["iva"],
        "total": totals["total"],
        "recebido": totals["recebido"],
        "quantidade_faturas": invoices.count(),
    }


def billing_by_status():
    """
    Groups invoice totals by status.
    """

    data = (
        Invoice.objects.filter(deletado=False)
        .values("estado")
        .annotate(total=Coalesce(Sum("total"), Decimal("0.00")))
        .order_by("estado")
    )

    return list(data)


def open_invoices():
    """
    Returns invoices with an outstanding patient balance.
    """

    return Invoice.objects.filter(
        deletado=False,
        ativo=True,
        estado=Invoice.Estado.EMITIDA,
        valor_paciente__gt=Decimal("0.00"),
    )


resumo_financeiro_periodo = financial_summary_by_period
faturamento_por_estado = billing_by_status
faturas_em_aberto = open_invoices
