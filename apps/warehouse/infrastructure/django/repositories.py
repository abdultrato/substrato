from __future__ import annotations

from decimal import Decimal
from uuid import uuid4

from django.db import transaction

from apps.warehouse.application.commands.replenishment import GenerateStockRequisition
from apps.warehouse.application.queries.stock import MinimumStockQuery
from apps.warehouse.domain.stock.value_objects.replenishment_policy import ReplenishmentPolicy
from apps.warehouse.models import ReplenishmentPlan, ReplenishmentSuggestion, StockLevel, WarehouseItem

ZERO = Decimal("0")


class DjangoStockRepository:
    def get_balance(self, query: MinimumStockQuery) -> Decimal:
        item = self._get_item(query)
        levels = StockLevel.objects.filter(item=item)
        if query.tenant_id:
            levels = levels.filter(tenant_id=query.tenant_id)
        if query.warehouse_id:
            levels = levels.filter(location__warehouse_id=query.warehouse_id)
        total = sum((Decimal(level.available_quantity or ZERO) for level in levels.select_related("location")), ZERO)
        return max(total, ZERO)

    def get_replenishment_policy(self, query: MinimumStockQuery) -> ReplenishmentPolicy:
        item = self._get_item(query)
        return ReplenishmentPolicy(
            minimum_quantity=Decimal(item.reorder_point or ZERO),
            requisition_quantity=Decimal(item.reorder_quantity or ZERO),
        )

    @staticmethod
    def _get_item(query: MinimumStockQuery) -> WarehouseItem:
        filters: dict[str, object] = {"sku": query.sku}
        if query.tenant_id:
            filters["tenant_id"] = query.tenant_id
        return WarehouseItem.objects.get(**filters)


class DjangoRequisitionRepository:
    def create_requisition(self, command: GenerateStockRequisition) -> str:
        if not command.tenant_id:
            raise ValueError("tenant_id is required to generate a warehouse requisition.")

        with transaction.atomic():
            item_filters: dict[str, object] = {"sku": command.sku}
            item_filters["tenant_id"] = command.tenant_id
            item = WarehouseItem.objects.get(**item_filters)
            plan = ReplenishmentPlan.objects.create(
                tenant_id=command.tenant_id,
                warehouse_id=command.warehouse_id,
                plan_number=self._next_number(),
                supplier_name="Fornecedor padrao",
                notes=f"Generated automatically by {command.reason} for {command.sku}.",
            )
            ReplenishmentSuggestion.objects.create(
                tenant_id=command.tenant_id,
                plan=plan,
                item=item,
                warehouse_id=command.warehouse_id,
                current_quantity=ZERO,
                reserved_quantity=ZERO,
                available_quantity=ZERO,
                reorder_point=Decimal(item.reorder_point or ZERO),
                recommended_quantity=Decimal(command.quantity),
            )
            return str(plan.pk)

    @staticmethod
    def _next_number() -> str:
        number = f"RPL-AUTO-{uuid4().hex[:10].upper()}"
        while ReplenishmentPlan.objects.filter(plan_number=number).exists():
            number = f"RPL-AUTO-{uuid4().hex[:10].upper()}"
        return number
