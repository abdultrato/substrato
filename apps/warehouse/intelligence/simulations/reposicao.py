from __future__ import annotations

from decimal import Decimal


def simular_dias_ate_rutura(estoque_atual: Decimal, consumo_diario: Decimal) -> int | None:
    consumo = Decimal(str(consumo_diario))
    if consumo <= 0:
        return None
    return int(Decimal(str(estoque_atual)) // consumo)
