from __future__ import annotations

from apps.warehouse.aplicacao.casos_de_uso.gerar_requisicao_automatica import GerarRequisicaoAutomatica
from apps.warehouse.aplicacao.consultas.estoque import ConsultaEstoqueMinimo
from apps.warehouse.eventos.schemas.estoque import SchemaEventoEstoqueMinimo


class ConsumidorReposicaoEstoque:
    def __init__(self, caso_de_uso: GerarRequisicaoAutomatica) -> None:
        self.caso_de_uso = caso_de_uso

    def consumir(self, evento: SchemaEventoEstoqueMinimo):
        payload = evento.payload
        return self.caso_de_uso.executar(
            ConsultaEstoqueMinimo(
                sku=payload["sku"],
                tenant_id=payload.get("tenant_id"),
                warehouse_id=payload.get("warehouse_id"),
            )
        )
