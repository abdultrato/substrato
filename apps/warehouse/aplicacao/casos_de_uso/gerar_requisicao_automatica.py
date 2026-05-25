from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

from apps.warehouse.aplicacao.comandos.reposicao import GerarRequisicaoEstoque
from apps.warehouse.aplicacao.consultas.estoque import ConsultaEstoqueMinimo
from apps.warehouse.aplicacao.contratos.repositorios import (
    PublicadorEventos,
    RepositorioEstoque,
    RepositorioRequisicoes,
)
from apps.warehouse.domain.stock.aggregates.estoque import AgregadoEstoque


@dataclass(frozen=True, slots=True)
class ResultadoRequisicaoAutomatica:
    requisicao_id: str
    comando: GerarRequisicaoEstoque
    quantidade_anterior: Decimal


class GerarRequisicaoAutomatica:
    def __init__(
        self,
        repositorio_estoque: RepositorioEstoque,
        repositorio_requisicoes: RepositorioRequisicoes,
        publicador_eventos: PublicadorEventos,
    ) -> None:
        self.repositorio_estoque = repositorio_estoque
        self.repositorio_requisicoes = repositorio_requisicoes
        self.publicador_eventos = publicador_eventos

    def executar(self, consulta: ConsultaEstoqueMinimo) -> ResultadoRequisicaoAutomatica | None:
        quantidade_atual = self.repositorio_estoque.consultar_saldo(consulta)
        politica = self.repositorio_estoque.politica_reposicao(consulta)
        agregado = AgregadoEstoque(
            sku=consulta.sku,
            tenant_id=consulta.tenant_id,
            quantidade_atual=quantidade_atual,
            politica=politica,
        )
        evento = agregado.avaliar_reposicao()
        if evento is None:
            return None

        comando = GerarRequisicaoEstoque(
            sku=consulta.sku,
            tenant_id=consulta.tenant_id,
            warehouse_id=consulta.warehouse_id,
            quantidade=evento.quantidade_requisicao,
        )
        requisicao_id = self.repositorio_requisicoes.criar_requisicao(comando)
        self.publicador_eventos.publicar(evento)
        return ResultadoRequisicaoAutomatica(
            requisicao_id=requisicao_id,
            comando=comando,
            quantidade_anterior=Decimal(str(quantidade_atual)),
        )
