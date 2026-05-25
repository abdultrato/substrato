from __future__ import annotations

from decimal import Decimal


def stock_turnover(consumo_periodo: Decimal, estoque_medio: Decimal) -> Decimal:
    estoque = Decimal(str(estoque_medio))
    if estoque <= 0:
        return Decimal("0")
    return Decimal(str(consumo_periodo)) / estoque
