from __future__ import annotations

from collections.abc import Iterable
from typing import Any

from apps.warehouse.application.queries.stock import MinimumStockQuery
from apps.warehouse.application.use_cases.generate_automatic_requisition import (
    AutomaticRequisitionResult,
    GenerateAutomaticRequisition,
)
from apps.warehouse.events.bus.domain_event_bus import DomainEventBus
from apps.warehouse.infrastructure.django.repositories import DjangoRequisitionRepository, DjangoStockRepository


def run_replenishment_automation(
    use_case: GenerateAutomaticRequisition,
    query: MinimumStockQuery,
) -> AutomaticRequisitionResult | None:
    return use_case.execute(query)


def build_replenishment_use_case(event_publisher: Any | None = None) -> GenerateAutomaticRequisition:
    return GenerateAutomaticRequisition(
        DjangoStockRepository(),
        DjangoRequisitionRepository(),
        event_publisher or DomainEventBus(),
    )


def trigger_replenishment_for_stock_change(
    *,
    sku: str,
    tenant_id: int | str,
    warehouse_ids: Iterable[int | str | None],
    event_publisher: Any | None = None,
) -> list[AutomaticRequisitionResult]:
    from observability.metrics import register_warehouse_replenishment_automation

    use_case = build_replenishment_use_case(event_publisher)
    results: list[AutomaticRequisitionResult] = []
    seen_warehouses: set[int | str | None] = set()

    for warehouse_id in warehouse_ids:
        if warehouse_id in seen_warehouses:
            continue
        seen_warehouses.add(warehouse_id)

        result = run_replenishment_automation(
            use_case,
            MinimumStockQuery(
                sku=sku,
                tenant_id=tenant_id,
                warehouse_id=warehouse_id,
            ),
        )
        if result is not None:
            results.append(result)
            register_warehouse_replenishment_automation("created_or_reused", tenant_id=tenant_id)
        else:
            register_warehouse_replenishment_automation("not_required", tenant_id=tenant_id)

    return results
