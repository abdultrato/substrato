from __future__ import annotations

from apps.warehouse.aplicacao.casos_de_uso.gerar_requisicao_automatica import (
    GerarRequisicaoAutomatica,
    ResultadoRequisicaoAutomatica,
)
from apps.warehouse.aplicacao.consultas.estoque import ConsultaEstoqueMinimo


class OrquestradorReposicaoEstoque:
    def __init__(self, caso_de_uso: GerarRequisicaoAutomatica) -> None:
        self.caso_de_uso = caso_de_uso

    def avaliar_e_repor(self, consulta: ConsultaEstoqueMinimo) -> ResultadoRequisicaoAutomatica | None:
        return self.caso_de_uso.executar(consulta)
