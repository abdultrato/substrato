from __future__ import annotations

from decimal import Decimal

ZERO = Decimal("0")


def recomendar_reposicao(consumo_previsto: Decimal, estoque_atual: Decimal, estoque_seguranca: Decimal = ZERO) -> Decimal:
    necessidade = Decimal(str(consumo_previsto)) + Decimal(str(estoque_seguranca)) - Decimal(str(estoque_atual))
    return max(ZERO, necessidade)
