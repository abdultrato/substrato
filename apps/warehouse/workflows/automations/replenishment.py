from __future__ import annotations

from apps.warehouse.application.queries.stock import MinimumStockQuery
from apps.warehouse.application.use_cases.generate_automatic_requisition import (
    AutomaticRequisitionResult,
    GenerateAutomaticRequisition,
)


def run_replenishment_automation(
    use_case: GenerateAutomaticRequisition,
    query: MinimumStockQuery,
) -> AutomaticRequisitionResult | None:
    return use_case.execute(query)
