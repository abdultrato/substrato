from __future__ import annotations

from collections.abc import Iterable


def contar_movimentos_por_tipo(tipos: Iterable[str]) -> dict[str, int]:
    resumo: dict[str, int] = {}
    for tipo in tipos:
        resumo[tipo] = resumo.get(tipo, 0) + 1
    return resumo
