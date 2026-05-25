from __future__ import annotations

from dataclasses import dataclass

from apps.warehouse.workflows.estados.estoque import EstadoEstoque


@dataclass(frozen=True, slots=True)
class TransicaoEstoque:
    origem: EstadoEstoque
    destino: EstadoEstoque
    motivo: str
