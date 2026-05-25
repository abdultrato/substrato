from __future__ import annotations

from enum import StrEnum


class EstadoModoOffline(StrEnum):
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"
    SINCRONIZANDO = "SINCRONIZANDO"
