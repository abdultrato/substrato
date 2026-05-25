from __future__ import annotations

from apps.warehouse.aplicacao.casos_de_uso.gerar_requisicao_automatica import (
    GerarRequisicaoAutomatica,
    ResultadoRequisicaoAutomatica,
)
from apps.warehouse.aplicacao.consultas.estoque import ConsultaEstoqueMinimo


def gerar_requisicao_automaticamente(
    caso_de_uso: GerarRequisicaoAutomatica,
    consulta: ConsultaEstoqueMinimo,
) -> ResultadoRequisicaoAutomatica | None:
    return caso_de_uso.executar(consulta)
