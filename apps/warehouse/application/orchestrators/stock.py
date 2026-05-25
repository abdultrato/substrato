from __future__ import annotations

from apps.warehouse.application.queries.stock import MinimumStockQuery
from apps.warehouse.application.use_cases.generate_automatic_requisition import (
    AutomaticRequisitionResult,
    GenerateAutomaticRequisition,
)


class StockReplenishmentOrchestrator:
    def __init__(self, use_case: GenerateAutomaticRequisition) -> None:
        self.use_case = use_case

    def evaluate_and_replenish(self, query: MinimumStockQuery) -> AutomaticRequisitionResult | None:
        return self.use_case.execute(query)
