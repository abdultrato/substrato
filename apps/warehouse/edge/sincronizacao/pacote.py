from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True, slots=True)
class PacoteSincronizacao:
    origem: str
    eventos: list[dict[str, Any]] = field(default_factory=list)
