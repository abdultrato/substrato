from __future__ import annotations

from decimal import Decimal
from uuid import uuid4

from django.db import transaction
from django.utils import timezone

from apps.warehouse.application.commands.replenishment import GenerateStockRequisition
from apps.warehouse.application.queries.stock import MinimumStockQuery
from apps.warehouse.domain.stock.value_objects.replenishment_policy import ReplenishmentPolicy
from apps.warehouse.models import (
    ReplenishmentPlan,
    ReplenishmentStatus,
    ReplenishmentSuggestion,
    ReplenishmentSuggestionStatus,
    StockLevel,
    WarehouseItem,
)

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
            current_quantity, reserved_quantity, available_quantity = self._stock_snapshot(
                tenant_id=command.tenant_id,
                item=item,
                warehouse_id=command.warehouse_id,
            )
            reorder_point = Decimal(item.reorder_point or ZERO)

            existing_suggestion = self._find_open_automatic_suggestion(command=command, item=item)
            if existing_suggestion:
                existing_suggestion.current_quantity = current_quantity
                existing_suggestion.reserved_quantity = reserved_quantity
                existing_suggestion.available_quantity = available_quantity
                existing_suggestion.reorder_point = reorder_point
                existing_suggestion.recommended_quantity = Decimal(command.quantity)
                existing_suggestion.save(
                    update_fields=[
                        "current_quantity",
                        "reserved_quantity",
                        "available_quantity",
                        "reorder_point",
                        "recommended_quantity",
                        "updated_at",
                    ]
                )
                plan = existing_suggestion.plan
                if plan.status == ReplenishmentStatus.DRAFT:
                    plan.status = ReplenishmentStatus.GENERATED
                    plan.generated_at = timezone.now()
                    plan.save(update_fields=["status", "generated_at", "updated_at"])
                return str(plan.pk)

            plan = ReplenishmentPlan.objects.create(
                tenant_id=command.tenant_id,
                warehouse_id=command.warehouse_id,
                plan_number=self._next_number(),
                status=ReplenishmentStatus.GENERATED,
                generated_at=timezone.now(),
                notes=f"Gerado automaticamente por {command.reason} para {command.sku}.",
            )
            ReplenishmentSuggestion.objects.create(
                tenant_id=command.tenant_id,
                plan=plan,
                item=item,
                warehouse_id=command.warehouse_id,
                current_quantity=current_quantity,
                reserved_quantity=reserved_quantity,
                available_quantity=available_quantity,
                reorder_point=reorder_point,
                recommended_quantity=Decimal(command.quantity),
            )
            return str(plan.pk)

    @staticmethod
    def _stock_snapshot(*, tenant_id, item: WarehouseItem, warehouse_id) -> tuple[Decimal, Decimal, Decimal]:
        levels = StockLevel.objects.filter(tenant_id=tenant_id, item=item).select_related("location")
        if warehouse_id:
            levels = levels.filter(location__warehouse_id=warehouse_id)

        current_quantity = sum((Decimal(level.quantity or ZERO) for level in levels), ZERO)
        reserved_quantity = sum((Decimal(level.reserved_quantity or ZERO) for level in levels), ZERO)
        available_quantity = max(current_quantity - reserved_quantity, ZERO)
        return current_quantity, reserved_quantity, available_quantity

    @staticmethod
    def _find_open_automatic_suggestion(
        *,
        command: GenerateStockRequisition,
        item: WarehouseItem,
    ) -> ReplenishmentSuggestion | None:
        return (
            ReplenishmentSuggestion.objects.select_for_update()
            .select_related("plan")
            .filter(
                tenant_id=command.tenant_id,
                item=item,
                warehouse_id=command.warehouse_id,
                status=ReplenishmentSuggestionStatus.OPEN,
                plan__status__in=[ReplenishmentStatus.DRAFT, ReplenishmentStatus.GENERATED],
                plan__plan_number__startswith="RPL-AUTO-",
            )
            .order_by("-created_at")
            .first()
        )

    @staticmethod
    def _next_number() -> str:
        number = f"RPL-AUTO-{uuid4().hex[:10].upper()}"
        while ReplenishmentPlan.objects.filter(plan_number=number).exists():
            number = f"RPL-AUTO-{uuid4().hex[:10].upper()}"
        return number
