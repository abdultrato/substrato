from __future__ import annotations

from enum import StrEnum


class EstadoSincronizacaoTempoReal(StrEnum):
    PENDENTE = "PENDENTE"
    SINCRONIZADO = "SINCRONIZADO"
    FALHOU = "FALHOU"
