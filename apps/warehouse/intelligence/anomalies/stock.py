from __future__ import annotations

from decimal import Decimal


def detectar_consumo_anomalo(consumo_atual: Decimal, media_historica: Decimal, fator_limite: Decimal = Decimal("2")) -> bool:
    media = Decimal(str(media_historica))
    if media <= 0:
        return False
    return Decimal(str(consumo_atual)) > media * Decimal(str(fator_limite))
