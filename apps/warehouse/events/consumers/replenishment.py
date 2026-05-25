from __future__ import annotations

from apps.warehouse.application.queries.stock import MinimumStockQuery
from apps.warehouse.application.use_cases.generate_automatic_requisition import GenerateAutomaticRequisition
from apps.warehouse.events.schemas.stock import MinimumStockEventSchema


class StockReplenishmentConsumer:
    def __init__(self, use_case: GenerateAutomaticRequisition) -> None:
        self.use_case = use_case

    def consume(self, event: MinimumStockEventSchema):
        payload = event.payload
        return self.use_case.execute(
            MinimumStockQuery(
                sku=payload["sku"],
                tenant_id=payload.get("tenant_id"),
                warehouse_id=payload.get("warehouse_id"),
            )
        )
