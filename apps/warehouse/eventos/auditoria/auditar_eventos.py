from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class AuditoriaEventosWarehouse:
    eventos: list[Any] = field(default_factory=list)

    def registrar(self, evento: Any) -> None:
        self.eventos.append(evento)
