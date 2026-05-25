from __future__ import annotations

from decimal import Decimal
from uuid import uuid4

from django.db import transaction

from apps.warehouse.aplicacao.comandos.reposicao import GerarRequisicaoEstoque
from apps.warehouse.aplicacao.consultas.estoque import ConsultaEstoqueMinimo
from apps.warehouse.domain.stock.value_objects.politica_reposicao import PoliticaReposicao
from apps.warehouse.models import ReplenishmentPlan, ReplenishmentSuggestion, StockLevel, WarehouseItem

ZERO = Decimal("0")


class RepositorioEstoqueDjango:
    def consultar_saldo(self, consulta: ConsultaEstoqueMinimo) -> Decimal:
        item = self._obter_item(consulta)
        levels = StockLevel.objects.filter(item=item)
        if consulta.tenant_id:
            levels = levels.filter(tenant_id=consulta.tenant_id)
        if consulta.warehouse_id:
            levels = levels.filter(location__warehouse_id=consulta.warehouse_id)
        total = sum((Decimal(level.available_quantity or ZERO) for level in levels.select_related("location")), ZERO)
        return max(total, ZERO)

    def politica_reposicao(self, consulta: ConsultaEstoqueMinimo) -> PoliticaReposicao:
        item = self._obter_item(consulta)
        return PoliticaReposicao(
            minimo=Decimal(item.reorder_point or ZERO),
            quantidade_requisicao=Decimal(item.reorder_quantity or ZERO),
        )

    @staticmethod
    def _obter_item(consulta: ConsultaEstoqueMinimo) -> WarehouseItem:
        filtro: dict[str, object] = {"sku": consulta.sku}
        if consulta.tenant_id:
            filtro["tenant_id"] = consulta.tenant_id
        return WarehouseItem.objects.get(**filtro)


class RepositorioRequisicoesDjango:
    def criar_requisicao(self, comando: GerarRequisicaoEstoque) -> str:
        if not comando.tenant_id:
            raise ValueError("tenant_id e obrigatorio para gerar requisicao de warehouse.")

        with transaction.atomic():
            filtro_item: dict[str, object] = {"sku": comando.sku}
            filtro_item["tenant_id"] = comando.tenant_id
            item = WarehouseItem.objects.get(**filtro_item)
            plan = ReplenishmentPlan.objects.create(
                tenant_id=comando.tenant_id,
                warehouse_id=comando.warehouse_id,
                plan_number=self._proximo_numero(),
                supplier_name="Fornecedor padrao",
                notes=f"Gerado automaticamente por {comando.motivo} para {comando.sku}.",
            )
            ReplenishmentSuggestion.objects.create(
                tenant_id=comando.tenant_id,
                plan=plan,
                item=item,
                warehouse_id=comando.warehouse_id,
                current_quantity=ZERO,
                reserved_quantity=ZERO,
                available_quantity=ZERO,
                reorder_point=Decimal(item.reorder_point or ZERO),
                recommended_quantity=Decimal(comando.quantidade),
            )
            return str(plan.pk)

    @staticmethod
    def _proximo_numero() -> str:
        numero = f"RPL-AUTO-{uuid4().hex[:10].upper()}"
        while ReplenishmentPlan.objects.filter(plan_number=numero).exists():
            numero = f"RPL-AUTO-{uuid4().hex[:10].upper()}"
        return numero
