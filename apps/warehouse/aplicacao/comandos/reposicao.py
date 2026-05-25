from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True, slots=True)
class GerarRequisicaoEstoque:
    sku: str
    quantidade: Decimal
    motivo: str = "ESTOQUE_ABAIXO_DO_MINIMO"
    warehouse_id: str | None = None
    tenant_id: str | None = None
