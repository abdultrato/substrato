from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from pathlib import Path

from apps.warehouse.application.queries.stock import MinimumStockQuery
from apps.warehouse.application.use_cases.generate_automatic_requisition import GenerateAutomaticRequisition
from apps.warehouse.domain.stock.aggregates.stock import StockAggregate
from apps.warehouse.domain.stock.business_rules.fefo import prioritize_fefo_lots
from apps.warehouse.domain.stock.value_objects.replenishment_policy import ReplenishmentPolicy
from apps.warehouse.infrastructure.substrato_os import get_substrato_os_integrations
from apps.warehouse.workflows.engine.engine import WarehouseWorkflowEngine

WAREHOUSE_ROOT = Path(__file__).resolve().parent


@dataclass(frozen=True)
class TestLot:
    lot_number: str
    expiration_date: date | None


class InMemoryStockRepository:
    def get_balance(self, query: MinimumStockQuery) -> Decimal:
        return Decimal("2")

    def get_replenishment_policy(self, query: MinimumStockQuery) -> ReplenishmentPolicy:
        return ReplenishmentPolicy(minimum_quantity=Decimal("5"), requisition_quantity=Decimal("10"))


class InMemoryRequisitionRepository:
    def __init__(self) -> None:
        self.commands = []

    def create_requisition(self, command) -> str:
        self.commands.append(command)
        return "REQ-1"


class InMemoryEventPublisher:
    def __init__(self) -> None:
        self.events = []

    def publish(self, event) -> None:
        self.events.append(event)


def test_stock_aggregate_generates_event_when_below_minimum():
    aggregate = StockAggregate(
        sku="SKU-001",
        current_quantity=Decimal("2"),
        policy=ReplenishmentPolicy(minimum_quantity=Decimal("5"), requisition_quantity=Decimal("10")),
        tenant_id="tenant-1",
    )

    event = aggregate.evaluate_replenishment()

    assert event is not None
    assert event.payload()["sku"] == "SKU-001"
    assert event.requested_quantity == Decimal("10")
    assert event.display_name_pt == "Estoque abaixo do mínimo"


def test_prioritize_fefo_lots_puts_nearest_expiration_first():
    lots = [
        TestLot("L3", None),
        TestLot("L2", date(2026, 6, 1)),
        TestLot("L1", date(2026, 5, 1)),
    ]

    ordered_lots = prioritize_fefo_lots(lots)

    assert [lot.lot_number for lot in ordered_lots] == ["L1", "L2", "L3"]


def test_use_case_generates_automatic_requisition_and_publishes_event():
    requisitions = InMemoryRequisitionRepository()
    publisher = InMemoryEventPublisher()
    use_case = GenerateAutomaticRequisition(InMemoryStockRepository(), requisitions, publisher)

    result = use_case.execute(MinimumStockQuery(sku="SKU-001", tenant_id="tenant-1"))

    assert result is not None
    assert result.requisition_id == "REQ-1"
    assert requisitions.commands[0].quantity == Decimal("10")
    assert publisher.events[0].sku == "SKU-001"


def test_workflow_engine_decides_replenishment_and_fefo():
    decisions = WarehouseWorkflowEngine().evaluate(
        {
            "current_quantity": "2",
            "minimum_quantity": "5",
            "is_perishable_product": True,
        }
    )

    assert [decision.action for decision in decisions] == ["GENERATE_REQUISITION", "PRIORITIZE_FEFO"]
    assert [decision.label_pt for decision in decisions] == ["Gerar requisição", "Priorizar FEFO"]


def test_warehouse_reuses_substrato_os_boundaries_instead_of_duplicating_platform_modules():
    integrations = get_substrato_os_integrations()

    assert not (WAREHOUSE_ROOT / "platform").exists()
    assert integrations.event_bus == "events.bus.event_bus"
    assert integrations.tenant_context == "apps.tenants"
    assert integrations.billing == "apps.billing"
    assert integrations.audit == "apps.audit_activities"
    assert integrations.permissions == "security.permissions.rbac"
    assert integrations.observability == "observability.opentelemetry"
