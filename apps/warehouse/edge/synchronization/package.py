from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True, slots=True)
class SynchronizationPackage:
    source: str
    events: list[dict[str, Any]] = field(default_factory=list)
