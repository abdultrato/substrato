from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any


@dataclass(frozen=True, slots=True)
class VersionedValue:
    value: Any
    version: int
    updated_at: datetime
    source_priority: int = 0

    def __post_init__(self) -> None:
        updated_at = self.updated_at
        if updated_at.tzinfo is None:
            updated_at = updated_at.replace(tzinfo=UTC)
        object.__setattr__(self, "version", int(self.version or 0))
        object.__setattr__(self, "updated_at", updated_at)
        object.__setattr__(self, "source_priority", int(self.source_priority or 0))


def resolve_by_last_write(local_value: Any, remote_value: Any, remote_is_newer: bool) -> Any:
    return remote_value if remote_is_newer else local_value


def resolve_versioned_conflict(local_value: VersionedValue, remote_value: VersionedValue) -> VersionedValue:
    if remote_value.version != local_value.version:
        return remote_value if remote_value.version > local_value.version else local_value

    if remote_value.updated_at != local_value.updated_at:
        return remote_value if remote_value.updated_at > local_value.updated_at else local_value

    if remote_value.source_priority != local_value.source_priority:
        return remote_value if remote_value.source_priority > local_value.source_priority else local_value

    return local_value
