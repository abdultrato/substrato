from __future__ import annotations

from decimal import Decimal
from typing import Any, Protocol

from apps.warehouse.aplicacao.comandos.reposicao import GerarRequisicaoEstoque
from apps.warehouse.aplicacao.consultas.estoque import ConsultaEstoqueMinimo
from apps.warehouse.domain.stock.value_objects.politica_reposicao import PoliticaReposicao


class RepositorioEstoque(Protocol):
    def consultar_saldo(self, consulta: ConsultaEstoqueMinimo) -> Decimal: ...

    def politica_reposicao(self, consulta: ConsultaEstoqueMinimo) -> PoliticaReposicao: ...


class RepositorioRequisicoes(Protocol):
    def criar_requisicao(self, comando: GerarRequisicaoEstoque) -> str: ...


class PublicadorEventos(Protocol):
    def publicar(self, evento: Any) -> None: ...
