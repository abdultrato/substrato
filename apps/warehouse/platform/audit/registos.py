from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any


@dataclass(frozen=True, slots=True)
class RegistoAuditoriaWarehouse:
    acao: str
    payload: dict[str, Any]
    ocorrido_em: datetime = field(default_factory=lambda: datetime.now(tz=UTC))
