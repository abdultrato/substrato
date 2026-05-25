from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ConsultaEstoqueMinimo:
    sku: str
    warehouse_id: str | None = None
    tenant_id: str | None = None
