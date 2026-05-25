from __future__ import annotations

from collections.abc import Mapping
from decimal import Decimal


def identificar_gargalo_por_tempo(etapas_minutos: Mapping[str, Decimal]) -> str | None:
    if not etapas_minutos:
        return None
    return max(etapas_minutos, key=lambda etapa: Decimal(str(etapas_minutos[etapa])))
