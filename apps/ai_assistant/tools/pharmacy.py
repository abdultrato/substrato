from __future__ import annotations

from datetime import timedelta
from typing import Any

from django.utils import timezone

from apps.pharmacy.models import Lot, Product
from security.permissions.rbac import GROUPS as RBAC_GROUPS

from .base import AiTool, AiToolContext


class PharmacyStockSummaryTool(AiTool):
    name = "get_pharmacy_stock_summary"
    description_pt = "Resume produtos, lotes vencidos, validade próxima e disponibilidade operacional."
    description_en = "Summarizes products, expired lots, near expiry and operational availability."
    required_groups = (RBAC_GROUPS["ADMIN"], RBAC_GROUPS["FARMACIA"], RBAC_GROUPS["ENFERMAGEM"], RBAC_GROUPS["MEDICINA"])
    mode = "read"

    def run(self, context: AiToolContext) -> dict[str, Any]:
        tenant = context.tenant
        today = timezone.localdate()
        near_expiry = today + timedelta(days=30)
        products_qs = Product.objects.filter(tenant=tenant, deleted=False)
        lots_qs = Lot.objects.filter(tenant=tenant, deleted=False).select_related("product")

        expiring_rows = []
        for lot in lots_qs.filter(expiration_date__gte=today, expiration_date__lte=near_expiry).order_by("expiration_date")[:8]:
            expiring_rows.append(
                {
                    "lot": lot.lot_number,
                    "product": getattr(lot.product, "name", ""),
                    "expiration_date": lot.expiration_date.isoformat(),
                    "balance": lot.balance(),
                }
            )

        return {
            "summary": {
                "title_pt": "Resumo de stock da farmácia",
                "title_en": "Pharmacy stock summary",
                "metrics": [
                    {"label_pt": "Produtos activos", "label_en": "Active products", "value": products_qs.count()},
                    {"label_pt": "Lotes activos", "label_en": "Active lots", "value": lots_qs.count()},
                    {"label_pt": "Lotes vencidos", "label_en": "Expired lots", "value": lots_qs.filter(expiration_date__lt=today).count()},
                    {"label_pt": "Vencem em 30 dias", "label_en": "Expire in 30 days", "value": len(expiring_rows)},
                ],
                "expiring_lots": expiring_rows,
            },
            "sources": [
                {"type": "model", "label": "Product", "href": "/pharmacy"},
                {"type": "model", "label": "Lot", "href": "/pharmacy"},
            ],
        }
