from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True, slots=True)
class CustoOperacaoWarehouse:
    tenant_id: str
    valor: Decimal
    moeda: str = "MZN"
