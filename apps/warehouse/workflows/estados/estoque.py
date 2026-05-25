from __future__ import annotations

from enum import StrEnum


class EstadoEstoque(StrEnum):
    NORMAL = "NORMAL"
    ABAIXO_MINIMO = "ABAIXO_MINIMO"
    REQUISICAO_GERADA = "REQUISICAO_GERADA"
    FEFO_PRIORIZADO = "FEFO_PRIORIZADO"
