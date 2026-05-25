from __future__ import annotations

from decimal import Decimal
from typing import Any

from apps.warehouse.domain.stock.business_rules.replenishment import is_below_minimum_stock


def minimum_stock_rule(context: dict[str, Any]) -> bool:
    return is_below_minimum_stock(
        Decimal(str(context.get("current_quantity", "0"))),
        Decimal(str(context.get("minimum_quantity", "0"))),
    )


def fefo_rule(context: dict[str, Any]) -> bool:
    return bool(context.get("is_perishable_product"))
