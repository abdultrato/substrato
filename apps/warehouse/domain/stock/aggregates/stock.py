from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

from apps.warehouse.domain.stock.business_rules.replenishment import should_generate_requisition
from apps.warehouse.domain.stock.domain_events.events import MinimumStockReached
from apps.warehouse.domain.stock.value_objects.replenishment_policy import ReplenishmentPolicy


@dataclass(slots=True)
class StockAggregate:
    sku: str
    current_quantity: Decimal
    policy: ReplenishmentPolicy
    tenant_id: str | None = None

    def evaluate_replenishment(self) -> MinimumStockReached | None:
        if not should_generate_requisition(self.current_quantity, self.policy):
            return None
        return MinimumStockReached(
            sku=self.sku,
            tenant_id=self.tenant_id,
            current_quantity=Decimal(str(self.current_quantity)),
            minimum_quantity=self.policy.minimum_quantity,
            requested_quantity=self.policy.calculate_requisition_quantity(self.current_quantity),
        )
