from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from apps.warehouse.domain.stock.domain_events.eventos import EstoqueAbaixoDoMinimo


@dataclass(frozen=True, slots=True)
class SchemaEventoEstoqueMinimo:
    nome: str
    payload: dict[str, Any]
    ocorrido_em: datetime
    identificador: str

    @classmethod
    def a_partir_evento(cls, evento: EstoqueAbaixoDoMinimo) -> SchemaEventoEstoqueMinimo:
        return cls(
            nome=evento.nome,
            payload=evento.payload(),
            ocorrido_em=evento.ocorrido_em,
            identificador=evento.identificador,
        )
