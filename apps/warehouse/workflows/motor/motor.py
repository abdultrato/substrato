from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from apps.warehouse.workflows.estados.estoque import EstadoEstoque
from apps.warehouse.workflows.regras.estoque import regra_estoque_minimo, regra_fefo
from apps.warehouse.workflows.transicoes.estoque import TransicaoEstoque


@dataclass(frozen=True, slots=True)
class DecisaoWorkflow:
    acao: str
    transicao: TransicaoEstoque


class MotorWorkflowsWarehouse:
    def avaliar(self, contexto: dict[str, Any]) -> list[DecisaoWorkflow]:
        decisoes: list[DecisaoWorkflow] = []
        if regra_estoque_minimo(contexto):
            decisoes.append(
                DecisaoWorkflow(
                    acao="GERAR_REQUISICAO",
                    transicao=TransicaoEstoque(
                        origem=EstadoEstoque.NORMAL,
                        destino=EstadoEstoque.ABAIXO_MINIMO,
                        motivo="estoque abaixo do minimo",
                    ),
                )
            )
        if regra_fefo(contexto):
            decisoes.append(
                DecisaoWorkflow(
                    acao="PRIORIZAR_FEFO",
                    transicao=TransicaoEstoque(
                        origem=EstadoEstoque.NORMAL,
                        destino=EstadoEstoque.FEFO_PRIORIZADO,
                        motivo="produto perecivel",
                    ),
                )
            )
        return decisoes
