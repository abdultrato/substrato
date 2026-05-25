from __future__ import annotations

from decimal import Decimal

from apps.warehouse.domain.stock.value_objects.politica_reposicao import PoliticaReposicao


def estoque_abaixo_do_minimo(quantidade_atual: Decimal, minimo: Decimal) -> bool:
    return Decimal(str(quantidade_atual)) < Decimal(str(minimo))


def deve_gerar_requisicao(quantidade_atual: Decimal, politica: PoliticaReposicao) -> bool:
    return estoque_abaixo_do_minimo(quantidade_atual, politica.minimo)


def calcular_quantidade_requisicao(quantidade_atual: Decimal, politica: PoliticaReposicao) -> Decimal:
    return politica.calcular_quantidade_requisicao(quantidade_atual)
