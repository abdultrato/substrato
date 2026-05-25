from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

from apps.warehouse.application.commands.replenishment import GenerateStockRequisition
from apps.warehouse.application.contracts.repositories import EventPublisher, RequisitionRepository, StockRepository
from apps.warehouse.application.queries.stock import MinimumStockQuery
from apps.warehouse.domain.stock.aggregates.stock import StockAggregate


@dataclass(frozen=True, slots=True)
class AutomaticRequisitionResult:
    requisition_id: str
    command: GenerateStockRequisition
    previous_quantity: Decimal


class GenerateAutomaticRequisition:
    def __init__(
        self,
        stock_repository: StockRepository,
        requisition_repository: RequisitionRepository,
        event_publisher: EventPublisher,
    ) -> None:
        self.stock_repository = stock_repository
        self.requisition_repository = requisition_repository
        self.event_publisher = event_publisher

    def execute(self, query: MinimumStockQuery) -> AutomaticRequisitionResult | None:
        current_quantity = self.stock_repository.get_balance(query)
        policy = self.stock_repository.get_replenishment_policy(query)
        aggregate = StockAggregate(
            sku=query.sku,
            tenant_id=query.tenant_id,
            current_quantity=current_quantity,
            policy=policy,
        )
        event = aggregate.evaluate_replenishment()
        if event is None:
            return None

        command = GenerateStockRequisition(
            sku=query.sku,
            tenant_id=query.tenant_id,
            warehouse_id=query.warehouse_id,
            quantity=event.requested_quantity,
        )
        requisition_id = self.requisition_repository.create_requisition(command)
        self.event_publisher.publish(event)
        return AutomaticRequisitionResult(
            requisition_id=requisition_id,
            command=command,
            previous_quantity=Decimal(str(current_quantity)),
        )
