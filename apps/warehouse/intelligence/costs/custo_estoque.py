from __future__ import annotations

from decimal import Decimal


def calcular_custo_medio_ponderado(valor_total: Decimal, quantidade_total: Decimal) -> Decimal:
    quantidade = Decimal(str(quantidade_total))
    if quantidade <= 0:
        return Decimal("0")
    return Decimal(str(valor_total)) / quantidade
