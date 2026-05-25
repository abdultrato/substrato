from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from apps.warehouse.aplicacao.casos_de_uso.gerar_requisicao_automatica import GerarRequisicaoAutomatica
from apps.warehouse.aplicacao.consultas.estoque import ConsultaEstoqueMinimo
from apps.warehouse.domain.stock.aggregates.estoque import AgregadoEstoque
from apps.warehouse.domain.stock.business_rules.fefo import priorizar_lotes_fefo
from apps.warehouse.domain.stock.value_objects.politica_reposicao import PoliticaReposicao
from apps.warehouse.workflows.motor.motor import MotorWorkflowsWarehouse


@dataclass(frozen=True)
class LoteTeste:
    lot_number: str
    expiration_date: date | None


class RepositorioEstoqueMemoria:
    def consultar_saldo(self, consulta: ConsultaEstoqueMinimo) -> Decimal:
        return Decimal("2")

    def politica_reposicao(self, consulta: ConsultaEstoqueMinimo) -> PoliticaReposicao:
        return PoliticaReposicao(minimo=Decimal("5"), quantidade_requisicao=Decimal("10"))


class RepositorioRequisicoesMemoria:
    def __init__(self) -> None:
        self.comandos = []

    def criar_requisicao(self, comando) -> str:
        self.comandos.append(comando)
        return "REQ-1"


class PublicadorEventosMemoria:
    def __init__(self) -> None:
        self.eventos = []

    def publicar(self, evento) -> None:
        self.eventos.append(evento)


def test_agregado_estoque_gera_evento_quando_abaixo_do_minimo():
    agregado = AgregadoEstoque(
        sku="SKU-001",
        quantidade_atual=Decimal("2"),
        politica=PoliticaReposicao(minimo=Decimal("5"), quantidade_requisicao=Decimal("10")),
        tenant_id="tenant-1",
    )

    evento = agregado.avaliar_reposicao()

    assert evento is not None
    assert evento.payload()["sku"] == "SKU-001"
    assert evento.quantidade_requisicao == Decimal("10")


def test_priorizar_lotes_fefo_coloca_validade_mais_proxima_primeiro():
    lotes = [
        LoteTeste("L3", None),
        LoteTeste("L2", date(2026, 6, 1)),
        LoteTeste("L1", date(2026, 5, 1)),
    ]

    ordenados = priorizar_lotes_fefo(lotes)

    assert [lote.lot_number for lote in ordenados] == ["L1", "L2", "L3"]


def test_caso_de_uso_gera_requisicao_automatica_e_publica_evento():
    requisicoes = RepositorioRequisicoesMemoria()
    publicador = PublicadorEventosMemoria()
    caso_de_uso = GerarRequisicaoAutomatica(RepositorioEstoqueMemoria(), requisicoes, publicador)

    resultado = caso_de_uso.executar(ConsultaEstoqueMinimo(sku="SKU-001", tenant_id="tenant-1"))

    assert resultado is not None
    assert resultado.requisicao_id == "REQ-1"
    assert requisicoes.comandos[0].quantidade == Decimal("10")
    assert publicador.eventos[0].sku == "SKU-001"


def test_motor_workflows_decide_reposicao_e_fefo():
    decisoes = MotorWorkflowsWarehouse().avaliar(
        {
            "quantidade_atual": "2",
            "minimo": "5",
            "produto_perecivel": True,
        }
    )

    assert [decisao.acao for decisao in decisoes] == ["GERAR_REQUISICAO", "PRIORIZAR_FEFO"]
