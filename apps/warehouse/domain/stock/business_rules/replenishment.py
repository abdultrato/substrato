from __future__ import annotations

from decimal import Decimal

from apps.warehouse.domain.stock.value_objects.replenishment_policy import ReplenishmentPolicy


def is_below_minimum_stock(current_quantity: Decimal, minimum_quantity: Decimal) -> bool:
    return Decimal(str(current_quantity)) < Decimal(str(minimum_quantity))


def should_generate_requisition(current_quantity: Decimal, policy: ReplenishmentPolicy) -> bool:
    return is_below_minimum_stock(current_quantity, policy.minimum_quantity)


def calculate_requisition_quantity(current_quantity: Decimal, policy: ReplenishmentPolicy) -> Decimal:
    return policy.calculate_requisition_quantity(current_quantity)
