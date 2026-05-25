from __future__ import annotations

from apps.warehouse.domain.stock.domain_events.eventos import EstoqueAbaixoDoMinimo
from apps.warehouse.eventos.barramento.barramento import BarramentoEventosDominio


class ProdutorEventosEstoque:
    def __init__(self, barramento: BarramentoEventosDominio | None = None) -> None:
        self.barramento = barramento or BarramentoEventosDominio()

    def publicar_estoque_abaixo_do_minimo(self, evento: EstoqueAbaixoDoMinimo) -> None:
        self.barramento.publicar(evento)
