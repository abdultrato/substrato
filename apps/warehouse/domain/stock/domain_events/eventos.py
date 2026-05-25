from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any
from uuid import uuid4


@dataclass(frozen=True, slots=True)
class EstoqueAbaixoDoMinimo:
    sku: str
    quantidade_atual: Decimal
    minimo: Decimal
    quantidade_requisicao: Decimal
    tenant_id: str | None = None
    nome: str = "warehouse.stock.estoque_abaixo_do_minimo"
    identificador: str = field(default_factory=lambda: str(uuid4()))
    ocorrido_em: datetime = field(default_factory=lambda: datetime.now(tz=UTC))

    def payload(self) -> dict[str, Any]:
        return {
            "sku": self.sku,
            "tenant_id": self.tenant_id,
            "quantidade_atual": str(self.quantidade_atual),
            "minimo": str(self.minimo),
            "quantidade_requisicao": str(self.quantidade_requisicao),
        }

    def to_evento_corporativo(self):
        from events.contract import Evento

        return Evento(nome=self.nome, payload=self.payload(), ocorrido_em=self.ocorrido_em, identificador=self.identificador)


@dataclass(frozen=True, slots=True)
class LotePerecivelPriorizado:
    sku: str
    lotes_ordenados: list[str]
    tenant_id: str | None = None
    nome: str = "warehouse.stock.lote_perecivel_priorizado"
    identificador: str = field(default_factory=lambda: str(uuid4()))
    ocorrido_em: datetime = field(default_factory=lambda: datetime.now(tz=UTC))

    def payload(self) -> dict[str, Any]:
        return {
            "sku": self.sku,
            "tenant_id": self.tenant_id,
            "lotes_ordenados": list(self.lotes_ordenados),
        }

    def to_evento_corporativo(self):
        from events.contract import Evento

        return Evento(nome=self.nome, payload=self.payload(), ocorrido_em=self.ocorrido_em, identificador=self.identificador)
