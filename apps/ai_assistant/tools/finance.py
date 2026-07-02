from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from typing import Any

from django.db.models import Count, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

from apps.billing.models import Invoice
from apps.payments.models import Payment
from security.permissions.rbac import GROUPS as RBAC_GROUPS

from .base import AiTool, AiToolContext, format_money
from .command_center import coerce_int


class FinancialOperationalSummaryTool(AiTool):
    name = "get_financial_operational_summary"
    description_pt = "Resume faturas, pagamentos, valores pendentes e reconciliação operacional."
    description_en = "Summarizes invoices, payments, pending amounts and operational reconciliation."
    required_groups = (RBAC_GROUPS["ADMIN"], RBAC_GROUPS["CONTABILIDADE"], RBAC_GROUPS["RECEPCAO"])
    mode = "read"

    def run(self, context: AiToolContext) -> dict[str, Any]:
        tenant = context.tenant
        days = coerce_int(context.arguments.get("days"), default=30, min_value=1, max_value=365)
        since = timezone.now() - timedelta(days=days)

        invoices_qs = Invoice.objects.filter(tenant=tenant, deleted=False, created_at__gte=since)
        payments_qs = Payment.objects.filter(tenant=tenant, deleted=False, created_at__gte=since)
        invoice_total = invoices_qs.aggregate(total=Coalesce(Sum("total"), Decimal("0.00")))["total"]
        confirmed_payment_total = payments_qs.filter(status=Payment.Status.CONFIRMED).aggregate(
            total=Coalesce(Sum("value"), Decimal("0.00"))
        )["total"]
        currency = str(getattr(getattr(tenant, "configuracao", None), "currency", "") or "MZN") or "MZN"

        return {
            "summary": {
                "title_pt": "Resumo financeiro operacional",
                "title_en": "Financial operational summary",
                "metrics": [
                    {"label_pt": "Faturas emitidas", "label_en": "Issued invoices", "value": invoices_qs.exclude(status=Invoice.Status.DRAFT).count()},
                    {"label_pt": "Faturas pagas", "label_en": "Paid invoices", "value": invoices_qs.filter(status=Invoice.Status.PAID).count()},
                    {"label_pt": "Faturas pendentes", "label_en": "Pending invoices", "value": invoices_qs.exclude(status__in=[Invoice.Status.PAID, Invoice.Status.CANCELED]).count()},
                    {"label_pt": "Total faturado", "label_en": "Invoiced total", "value": format_money(invoice_total, currency=currency)},
                    {"label_pt": "Pagamentos confirmados", "label_en": "Confirmed payments", "value": format_money(confirmed_payment_total, currency=currency)},
                    {"label_pt": "Pagamentos falhados", "label_en": "Failed payments", "value": payments_qs.filter(status=Payment.Status.FAILED).count()},
                ],
                "invoice_status": list(invoices_qs.values("status").annotate(total=Count("id")).order_by("-total", "status")),
                "payment_status": list(payments_qs.values("status").annotate(total=Count("id")).order_by("-total", "status")),
            },
            "sources": [
                {"type": "model", "label": "Invoice", "href": "/invoices"},
                {"type": "model", "label": "Payment", "href": "/payments"},
            ],
        }
