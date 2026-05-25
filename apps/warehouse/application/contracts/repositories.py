from __future__ import annotations

from decimal import Decimal
from typing import Any, Protocol

from apps.warehouse.application.commands.replenishment import GenerateStockRequisition
from apps.warehouse.application.queries.stock import MinimumStockQuery
from apps.warehouse.domain.stock.value_objects.replenishment_policy import ReplenishmentPolicy


class StockRepository(Protocol):
    def get_balance(self, query: MinimumStockQuery) -> Decimal: ...

    def get_replenishment_policy(self, query: MinimumStockQuery) -> ReplenishmentPolicy: ...


class RequisitionRepository(Protocol):
    def create_requisition(self, command: GenerateStockRequisition) -> str: ...


class EventPublisher(Protocol):
    def publish(self, event: Any) -> None: ...
