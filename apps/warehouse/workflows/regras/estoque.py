from __future__ import annotations

from decimal import Decimal
from typing import Any

from apps.warehouse.domain.stock.business_rules.reposicao import estoque_abaixo_do_minimo


def regra_estoque_minimo(contexto: dict[str, Any]) -> bool:
    return estoque_abaixo_do_minimo(
        Decimal(str(contexto.get("quantidade_atual", "0"))),
        Decimal(str(contexto.get("minimo", "0"))),
    )


def regra_fefo(contexto: dict[str, Any]) -> bool:
    return bool(contexto.get("produto_perecivel"))
