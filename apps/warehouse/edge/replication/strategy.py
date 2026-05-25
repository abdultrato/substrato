from __future__ import annotations

from enum import StrEnum


class ReplicationStrategy(StrEnum):
    OUTBOX = "OUTBOX"
    SNAPSHOT = "SNAPSHOT"
    EVENT_STREAM = "EVENT_STREAM"
