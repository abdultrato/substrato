from __future__ import annotations

from enum import StrEnum


class OfflineModeState(StrEnum):
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"
    SYNCHRONIZING = "SYNCHRONIZING"
