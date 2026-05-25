from __future__ import annotations

from enum import StrEnum


class EstrategiaReplicacao(StrEnum):
    OUTBOX = "OUTBOX"
    SNAPSHOT = "SNAPSHOT"
    EVENT_STREAM = "EVENT_STREAM"
