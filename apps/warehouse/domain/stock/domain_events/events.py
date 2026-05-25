from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any
from uuid import uuid4


@dataclass(frozen=True, slots=True)
class MinimumStockReached:
    sku: str
    current_quantity: Decimal
    minimum_quantity: Decimal
    requested_quantity: Decimal
    tenant_id: str | None = None
    name: str = "warehouse.inventory.minimum_stock_reached"
    display_name_pt: str = "Estoque abaixo do minimo"
    identifier: str = field(default_factory=lambda: str(uuid4()))
    occurred_at: datetime = field(default_factory=lambda: datetime.now(tz=UTC))

    def payload(self) -> dict[str, Any]:
        return {
            "sku": self.sku,
            "tenant_id": self.tenant_id,
            "current_quantity": str(self.current_quantity),
            "minimum_quantity": str(self.minimum_quantity),
            "requested_quantity": str(self.requested_quantity),
        }

    def to_corporate_event(self):
        from events.contract import Evento

        return Evento(nome=self.name, payload=self.payload(), ocorrido_em=self.occurred_at, identificador=self.identifier)


@dataclass(frozen=True, slots=True)
class PerishableLotPrioritized:
    sku: str
    ordered_lots: list[str]
    tenant_id: str | None = None
    name: str = "warehouse.inventory.perishable_lot_prioritized"
    display_name_pt: str = "Lote perecivel priorizado"
    identifier: str = field(default_factory=lambda: str(uuid4()))
    occurred_at: datetime = field(default_factory=lambda: datetime.now(tz=UTC))

    def payload(self) -> dict[str, Any]:
        return {
            "sku": self.sku,
            "tenant_id": self.tenant_id,
            "ordered_lots": list(self.ordered_lots),
        }

    def to_corporate_event(self):
        from events.contract import Evento

        return Evento(nome=self.name, payload=self.payload(), ocorrido_em=self.occurred_at, identificador=self.identifier)
