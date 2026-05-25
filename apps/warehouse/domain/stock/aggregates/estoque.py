from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

from apps.warehouse.domain.stock.business_rules.reposicao import deve_gerar_requisicao
from apps.warehouse.domain.stock.domain_events.eventos import EstoqueAbaixoDoMinimo
from apps.warehouse.domain.stock.value_objects.politica_reposicao import PoliticaReposicao


@dataclass(slots=True)
class AgregadoEstoque:
    sku: str
    quantidade_atual: Decimal
    politica: PoliticaReposicao
    tenant_id: str | None = None

    def avaliar_reposicao(self) -> EstoqueAbaixoDoMinimo | None:
        if not deve_gerar_requisicao(self.quantidade_atual, self.politica):
            return None
        return EstoqueAbaixoDoMinimo(
            sku=self.sku,
            tenant_id=self.tenant_id,
            quantidade_atual=Decimal(str(self.quantidade_atual)),
            minimo=self.politica.minimo,
            quantidade_requisicao=self.politica.calcular_quantidade_requisicao(self.quantidade_atual),
        )
