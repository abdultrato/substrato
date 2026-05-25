from __future__ import annotations

from collections.abc import Iterable
from decimal import Decimal

ZERO = Decimal("0")


def prever_consumo_medio(consumos_diarios: Iterable[Decimal], horizonte_dias: int) -> Decimal:
    consumos = [Decimal(str(valor)) for valor in consumos_diarios]
    if not consumos or horizonte_dias <= 0:
        return ZERO
    media = sum(consumos, ZERO) / Decimal(len(consumos))
    return media * Decimal(horizonte_dias)
