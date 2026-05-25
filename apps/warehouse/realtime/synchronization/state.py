from __future__ import annotations

from enum import StrEnum


class RealtimeSynchronizationState(StrEnum):
    IDLE = "IDLE"
    STREAMING = "STREAMING"
    DEGRADED = "DEGRADED"
