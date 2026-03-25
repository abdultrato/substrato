from decimal import Decimal

from django.db.models import F, Sum
from django.db.models.functions import Coalesce

from apps.billing.models.invoice import Invoice


def financial_summary_by_period(start_date, end_date):
    """
    Consolidated financial summary for the given date range.
    """

    invoices = Invoice.objects.filter(
        created_at__date__gte=start_date,
        created_at__date__lte=end_date,
        deleted=False,
        status__in=[
            Invoice.Status.ISSUED,
            Invoice.Status.PAID,
        ],
    )

    totals = invoices.aggregate(
        subtotal=Coalesce(Sum("subtotal"), Decimal("0.00")),
        iva=Coalesce(Sum("vat_amount"), Decimal("0.00")),
        total=Coalesce(Sum("total"), Decimal("0.00")),
        recebido=Coalesce(
            Sum(F("patient_amount") + F("insurance_amount")),
            Decimal("0.00"),
        ),
    )

    return {
        "subtotal": totals["subtotal"],
        "iva": totals["iva"],
        "total": totals["total"],
        "recebido": totals["recebido"],
        "quantity_faturas": invoices.count(),
    }


def billing_by_status():
    """
    Groups invoice totals by status.
    """

    date = (
        Invoice.objects.filter(deleted=False)
        .values("status")
        .annotate(total=Coalesce(Sum("total"), Decimal("0.00")))
        .order_by("status")
    )

    return list(date)


def open_invoices():
    """
    Returns invoices with an outstanding patient balance.
    """

    return Invoice.objects.filter(
        deleted=False,
        active=True,
        status=Invoice.Status.ISSUED,
        patient_amount__gt=Decimal("0.00"),
    )

