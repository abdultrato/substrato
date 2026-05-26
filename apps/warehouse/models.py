from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models, transaction
from django.utils import timezone

from core.models.base import CoreModel, NoNameCoreModel

ZERO = Decimal("0.0000")
MIN_QUANTITY = MinValueValidator(Decimal("0.0001"))
MIN_NON_NEGATIVE = MinValueValidator(ZERO)


class WarehouseStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Ativo"
    INACTIVE = "INACTIVE", "Inativo"


class DocumentStatus(models.TextChoices):
    DRAFT = "DRAFT", "Rascunho"
    POSTED = "POSTED", "Lançado"
    CANCELLED = "CANCELLED", "Cancelado"


class SalesOrderStatus(models.TextChoices):
    DRAFT = "DRAFT", "Rascunho"
    CONFIRMED = "CONFIRMED", "Confirmado"
    ALLOCATED = "ALLOCATED", "Reservado"
    PICKING = "PICKING", "Em separação"
    PARTIALLY_SHIPPED = "PARTIALLY_SHIPPED", "Parcialmente expedido"
    SHIPPED = "SHIPPED", "Expedido"
    CANCELLED = "CANCELLED", "Cancelado"


class ReservationStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Ativa"
    RELEASED = "RELEASED", "Liberada"
    CONSUMED = "CONSUMED", "Consumida"
    CANCELLED = "CANCELLED", "Cancelada"


class PickListStatus(models.TextChoices):
    DRAFT = "DRAFT", "Rascunho"
    OPEN = "OPEN", "Aberta"
    PICKED = "PICKED", "Separada"
    CANCELLED = "CANCELLED", "Cancelada"


class ShipmentStatus(models.TextChoices):
    DRAFT = "DRAFT", "Rascunho"
    SHIPPED = "SHIPPED", "Expedida"
    CANCELLED = "CANCELLED", "Cancelada"


class ReplenishmentStatus(models.TextChoices):
    DRAFT = "DRAFT", "Rascunho"
    GENERATED = "GENERATED", "Gerado"
    ORDERED = "ORDERED", "Pedido criado"
    CANCELLED = "CANCELLED", "Cancelado"


class ReplenishmentSuggestionStatus(models.TextChoices):
    OPEN = "OPEN", "Aberta"
    ORDERED = "ORDERED", "Pedido criado"
    IGNORED = "IGNORED", "Ignorada"


class Warehouse(CoreModel):
    class WarehouseType(models.TextChoices):
        CENTRAL = "CENTRAL", "Central"
        CLINICAL = "CLINICAL", "Clínico"
        PHARMACY = "PHARMACY", "Farmácia"
        MAINTENANCE = "MAINTENANCE", "Manutenção"
        PRODUCTION = "PRODUCTION", "Produção"
        OTHER = "OTHER", "Outro"

    prefix = "WHS"

    code = models.CharField(db_column="code", max_length=32)
    warehouse_type = models.CharField(
        db_column="warehouse_type",
        max_length=24,
        choices=WarehouseType.choices,
        default=WarehouseType.CENTRAL,
    )
    address = models.CharField(db_column="address", max_length=255, blank=True, default="")
    status = models.CharField(
        db_column="status",
        max_length=16,
        choices=WarehouseStatus.choices,
        default=WarehouseStatus.ACTIVE,
    )

    class Meta:
        db_table = "warehouse_warehouse"
        verbose_name = "Armazém"
        verbose_name_plural = "Armazéns"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "code"], name="warehouse_tenant_code_uniq"),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "warehouse_type"]),
        ]

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"


class StorageLocation(CoreModel):
    class LocationType(models.TextChoices):
        DOCK = "DOCK", "Doca"
        ZONE = "ZONE", "Zona"
        AISLE = "AISLE", "Corredor"
        RACK = "RACK", "Estante"
        SHELF = "SHELF", "Prateleira"
        BIN = "BIN", "Posição"
        QUARANTINE = "QUARANTINE", "Quarentena"
        DISPATCH = "DISPATCH", "Expedição"

    prefix = "LOC"

    warehouse = models.ForeignKey(
        "warehouse.Warehouse",
        db_column="warehouse_id",
        on_delete=models.PROTECT,
        related_name="locations",
    )
    parent = models.ForeignKey(
        "self",
        db_column="parent_id",
        on_delete=models.PROTECT,
        related_name="children",
        null=True,
        blank=True,
    )
    code = models.CharField(db_column="code", max_length=48)
    location_type = models.CharField(
        db_column="location_type",
        max_length=24,
        choices=LocationType.choices,
        default=LocationType.BIN,
    )
    barcode = models.CharField(db_column="barcode", max_length=80, blank=True, default="")
    status = models.CharField(
        db_column="status",
        max_length=16,
        choices=WarehouseStatus.choices,
        default=WarehouseStatus.ACTIVE,
    )

    class Meta:
        db_table = "warehouse_location"
        verbose_name = "Localização de Armazém"
        verbose_name_plural = "Localizações de Armazém"
        ordering = ["warehouse__name", "code"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "warehouse", "code"], name="warehouse_location_code_uniq"),
        ]
        indexes = [
            models.Index(fields=["tenant", "warehouse", "status"]),
            models.Index(fields=["tenant", "location_type"]),
        ]

    def clean(self):
        super().clean()
        if self.warehouse_id and self.tenant_id and self.warehouse.tenant_id != self.tenant_id:
            raise ValidationError({"warehouse": "Armazém e localização devem pertencer ao mesmo tenant."})
        if self.parent_id and self.tenant_id and self.parent.tenant_id != self.tenant_id:
            raise ValidationError({"parent": "Localização superior deve pertencer ao mesmo tenant."})
        if self.parent_id and self.parent_id == self.pk:
            raise ValidationError({"parent": "A localização não pode ser superior de si mesma."})

    def __str__(self) -> str:
        return f"{self.warehouse.code}/{self.code}"


class WarehouseItemCategory(CoreModel):
    prefix = "WCT"

    code = models.CharField(db_column="code", max_length=32)
    status = models.CharField(
        db_column="status",
        max_length=16,
        choices=WarehouseStatus.choices,
        default=WarehouseStatus.ACTIVE,
    )

    class Meta:
        db_table = "warehouse_item_category"
        verbose_name = "Categoria de Item"
        verbose_name_plural = "Categorias de Itens"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "code"], name="warehouse_category_code_uniq"),
            models.UniqueConstraint(fields=["tenant", "name"], name="warehouse_category_name_uniq"),
        ]

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"


class WarehouseItem(CoreModel):
    class ItemType(models.TextChoices):
        PRODUCT = "PRODUCT", "Produto"
        MATERIAL = "MATERIAL", "Material"
        CONSUMABLE = "CONSUMABLE", "Consumível"
        SPARE_PART = "SPARE_PART", "Peça"
        SERVICE = "SERVICE", "Serviço"
        ASSET = "ASSET", "Ativo"

    prefix = "SKU"

    sku = models.CharField(db_column="sku", max_length=64)
    category = models.ForeignKey(
        "warehouse.WarehouseItemCategory",
        db_column="category_id",
        on_delete=models.PROTECT,
        related_name="items",
        null=True,
        blank=True,
    )
    item_type = models.CharField(
        db_column="item_type",
        max_length=24,
        choices=ItemType.choices,
        default=ItemType.PRODUCT,
    )
    unit_of_measure = models.CharField(db_column="unit_of_measure", max_length=16, default="UN")
    barcode = models.CharField(db_column="barcode", max_length=80, blank=True, default="")
    reorder_point = models.DecimalField(
        db_column="reorder_point",
        max_digits=14,
        decimal_places=4,
        default=ZERO,
        validators=[MIN_NON_NEGATIVE],
    )
    reorder_quantity = models.DecimalField(
        db_column="reorder_quantity",
        max_digits=14,
        decimal_places=4,
        default=ZERO,
        validators=[MIN_NON_NEGATIVE],
    )
    pharmacy_product = models.ForeignKey(
        "farmacia.Product",
        db_column="pharmacy_product_id",
        on_delete=models.SET_NULL,
        related_name="warehouse_items",
        null=True,
        blank=True,
        help_text="Ligação opcional para reutilizar cadastro da farmácia sem duplicar produtos.",
    )
    external_reference = models.CharField(db_column="external_reference", max_length=120, blank=True, default="")
    status = models.CharField(
        db_column="status",
        max_length=16,
        choices=WarehouseStatus.choices,
        default=WarehouseStatus.ACTIVE,
    )

    class Meta:
        db_table = "warehouse_item"
        verbose_name = "Item de Estoque"
        verbose_name_plural = "Itens de Estoque"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "sku"], name="warehouse_item_sku_uniq"),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "item_type"]),
            models.Index(fields=["tenant", "barcode"]),
        ]

    def clean(self):
        super().clean()
        if self.category_id and self.tenant_id and self.category.tenant_id != self.tenant_id:
            raise ValidationError({"category": "Categoria e item devem pertencer ao mesmo tenant."})
        if self.pharmacy_product_id and self.tenant_id and self.pharmacy_product.tenant_id != self.tenant_id:
            raise ValidationError({"pharmacy_product": "Produto da farmácia deve pertencer ao mesmo tenant."})

    def __str__(self) -> str:
        return f"{self.sku} - {self.name}"


class WarehouseLot(NoNameCoreModel):
    class LotStatus(models.TextChoices):
        AVAILABLE = "AVAILABLE", "Disponível"
        QUARANTINE = "QUARANTINE", "Quarentena"
        BLOCKED = "BLOCKED", "Bloqueado"
        EXPIRED = "EXPIRED", "Vencido"

    prefix = "WLOT"

    item = models.ForeignKey(
        "warehouse.WarehouseItem",
        db_column="item_id",
        on_delete=models.PROTECT,
        related_name="lots",
    )
    lot_number = models.CharField(db_column="lot_number", max_length=80)
    expiration_date = models.DateField(db_column="expiration_date", null=True, blank=True)
    received_at = models.DateField(db_column="received_at", null=True, blank=True)
    unit_cost = models.DecimalField(
        db_column="unit_cost",
        max_digits=14,
        decimal_places=4,
        default=ZERO,
        validators=[MIN_NON_NEGATIVE],
    )
    status = models.CharField(
        db_column="status",
        max_length=16,
        choices=LotStatus.choices,
        default=LotStatus.AVAILABLE,
    )

    class Meta:
        db_table = "warehouse_lot"
        verbose_name = "Lote WMS"
        verbose_name_plural = "Lotes WMS"
        ordering = ["expiration_date", "lot_number"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "item", "lot_number"], name="warehouse_lot_item_number_uniq"),
        ]
        indexes = [
            models.Index(fields=["tenant", "item", "status"]),
            models.Index(fields=["tenant", "expiration_date"]),
        ]

    @property
    def expired(self) -> bool:
        return bool(self.expiration_date and self.expiration_date < timezone.localdate())

    def clean(self):
        super().clean()
        if self.item_id and self.tenant_id and self.item.tenant_id != self.tenant_id:
            raise ValidationError({"item": "Item e lote devem pertencer ao mesmo tenant."})

    def __str__(self) -> str:
        return f"{self.item.sku} / {self.lot_number}"


class StockLevel(NoNameCoreModel):
    prefix = "STK"

    item = models.ForeignKey(
        "warehouse.WarehouseItem",
        db_column="item_id",
        on_delete=models.PROTECT,
        related_name="stock_levels",
    )
    lot = models.ForeignKey(
        "warehouse.WarehouseLot",
        db_column="lot_id",
        on_delete=models.PROTECT,
        related_name="stock_levels",
        null=True,
        blank=True,
    )
    location = models.ForeignKey(
        "warehouse.StorageLocation",
        db_column="location_id",
        on_delete=models.PROTECT,
        related_name="stock_levels",
    )
    quantity = models.DecimalField(
        db_column="quantity",
        max_digits=14,
        decimal_places=4,
        default=ZERO,
        validators=[MIN_NON_NEGATIVE],
    )

    class Meta:
        db_table = "warehouse_stock_level"
        verbose_name = "Saldo de Estoque"
        verbose_name_plural = "Saldos de Estoque"
        ordering = ["item__name", "location__code"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "item", "lot", "location"], name="warehouse_stock_level_uniq"),
        ]
        indexes = [
            models.Index(fields=["tenant", "item", "location"]),
            models.Index(fields=["tenant", "lot"]),
        ]

    @classmethod
    def current(cls, *, tenant, item, location, lot=None) -> Decimal:
        level = cls.objects.filter(tenant=tenant, item=item, location=location, lot=lot).first()
        return level.quantity if level else ZERO

    @classmethod
    def active_reserved_quantity(cls, *, tenant, item, location, lot=None) -> Decimal:
        reserved = (
            StockReservation.objects.filter(
                tenant=tenant,
                item=item,
                location=location,
                lot=lot,
                status=ReservationStatus.ACTIVE,
            ).aggregate(total=models.Sum("quantity"))["total"]
            or ZERO
        )
        return Decimal(reserved or ZERO)

    @classmethod
    def available_quantity_for(cls, *, tenant, item, location, lot=None) -> Decimal:
        physical = cls.current(tenant=tenant, item=item, location=location, lot=lot)
        reserved = cls.active_reserved_quantity(tenant=tenant, item=item, location=location, lot=lot)
        available = Decimal(physical or ZERO) - Decimal(reserved or ZERO)
        return max(available, ZERO)

    @classmethod
    def adjust(cls, *, tenant, item, location, quantity_delta: Decimal, lot=None) -> StockLevel:
        if not location:
            raise ValidationError("Localização é obrigatória para ajustar estoque.")

        delta = Decimal(quantity_delta)
        with transaction.atomic():
            level, _created = (
                cls.objects.select_for_update()
                .filter(tenant=tenant, item=item, lot=lot, location=location)
                .get_or_create(
                    tenant=tenant,
                    item=item,
                    lot=lot,
                    location=location,
                    defaults={"quantity": ZERO},
                )
            )
            next_quantity = Decimal(level.quantity or ZERO) + delta
            if next_quantity < ZERO:
                raise ValidationError(
                    f"Estoque insuficiente em {location}: saldo {level.quantity}, movimento {abs(delta)}."
                )
            level.quantity = next_quantity
            level.save(update_fields=["quantity", "updated_at"])
            return level

    def clean(self):
        super().clean()
        if self.item_id and self.tenant_id and self.item.tenant_id != self.tenant_id:
            raise ValidationError({"item": "Item e saldo devem pertencer ao mesmo tenant."})
        if self.lot_id and self.tenant_id and self.lot.tenant_id != self.tenant_id:
            raise ValidationError({"lot": "Lote e saldo devem pertencer ao mesmo tenant."})
        if self.lot_id and self.item_id and self.lot.item_id != self.item_id:
            raise ValidationError({"lot": "O lote informado não pertence ao item selecionado."})
        if self.location_id and self.tenant_id and self.location.tenant_id != self.tenant_id:
            raise ValidationError({"location": "Localização e saldo devem pertencer ao mesmo tenant."})

    def __str__(self) -> str:
        lot = self.lot.lot_number if self.lot_id else "sem lote"
        return f"{self.item.sku} @ {self.location} / {lot}: {self.quantity}"

    @property
    def reserved_quantity(self) -> Decimal:
        return self.active_reserved_quantity(tenant=self.tenant, item=self.item, lot=self.lot, location=self.location)

    @property
    def available_quantity(self) -> Decimal:
        return max(Decimal(self.quantity or ZERO) - Decimal(self.reserved_quantity or ZERO), ZERO)


class StockMovement(CoreModel):
    class MovementType(models.TextChoices):
        RECEIPT = "RECEIPT", "Entrada"
        ISSUE = "ISSUE", "Saída"
        TRANSFER = "TRANSFER", "Transferência"
        ADJUSTMENT_IN = "ADJUSTMENT_IN", "Ajuste positivo"
        ADJUSTMENT_OUT = "ADJUSTMENT_OUT", "Ajuste negativo"
        COUNT_CORRECTION = "COUNT_CORRECTION", "Correção de inventário"

    prefix = "WMOV"

    item = models.ForeignKey(
        "warehouse.WarehouseItem",
        db_column="item_id",
        on_delete=models.PROTECT,
        related_name="stock_movements",
    )
    lot = models.ForeignKey(
        "warehouse.WarehouseLot",
        db_column="lot_id",
        on_delete=models.PROTECT,
        related_name="stock_movements",
        null=True,
        blank=True,
    )
    source_location = models.ForeignKey(
        "warehouse.StorageLocation",
        db_column="source_location_id",
        on_delete=models.PROTECT,
        related_name="outbound_movements",
        null=True,
        blank=True,
    )
    destination_location = models.ForeignKey(
        "warehouse.StorageLocation",
        db_column="destination_location_id",
        on_delete=models.PROTECT,
        related_name="inbound_movements",
        null=True,
        blank=True,
    )
    movement_type = models.CharField(db_column="movement_type", max_length=24, choices=MovementType.choices)
    quantity = models.DecimalField(
        db_column="quantity",
        max_digits=14,
        decimal_places=4,
        validators=[MIN_QUANTITY],
    )
    unit_cost = models.DecimalField(
        db_column="unit_cost",
        max_digits=14,
        decimal_places=4,
        default=ZERO,
        validators=[MIN_NON_NEGATIVE],
    )
    reference_document = models.CharField(db_column="reference_document", max_length=120, blank=True, default="")
    reason = models.CharField(db_column="reason", max_length=255, blank=True, default="")
    status = models.CharField(
        db_column="status",
        max_length=16,
        choices=DocumentStatus.choices,
        default=DocumentStatus.POSTED,
    )
    posted_at = models.DateTimeField(db_column="posted_at", null=True, blank=True)

    class Meta:
        db_table = "warehouse_stock_movement"
        verbose_name = "Movimento WMS"
        verbose_name_plural = "Movimentos WMS"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "item", "created_at"]),
            models.Index(fields=["tenant", "movement_type", "status"]),
            models.Index(fields=["tenant", "source_location"]),
            models.Index(fields=["tenant", "destination_location"]),
        ]

    def clean(self):
        super().clean()
        if self.item_id and self.tenant_id and self.item.tenant_id != self.tenant_id:
            raise ValidationError({"item": "Item e movimento devem pertencer ao mesmo tenant."})
        if self.lot_id and self.tenant_id and self.lot.tenant_id != self.tenant_id:
            raise ValidationError({"lot": "Lote e movimento devem pertencer ao mesmo tenant."})
        if self.lot_id and self.item_id and self.lot.item_id != self.item_id:
            raise ValidationError({"lot": "O lote informado não pertence ao item selecionado."})
        if self.source_location_id and self.tenant_id and self.source_location.tenant_id != self.tenant_id:
            raise ValidationError({"source_location": "Origem deve pertencer ao mesmo tenant."})
        if self.destination_location_id and self.tenant_id and self.destination_location.tenant_id != self.tenant_id:
            raise ValidationError({"destination_location": "Destino deve pertencer ao mesmo tenant."})

        if self.movement_type in {self.MovementType.RECEIPT, self.MovementType.ADJUSTMENT_IN}:
            if not self.destination_location_id or self.source_location_id:
                raise ValidationError("Entradas exigem apenas localização de destino.")
        elif self.movement_type in {self.MovementType.ISSUE, self.MovementType.ADJUSTMENT_OUT}:
            if not self.source_location_id or self.destination_location_id:
                raise ValidationError("Saídas exigem apenas localização de origem.")
        elif self.movement_type in {self.MovementType.TRANSFER, self.MovementType.COUNT_CORRECTION}:
            if not self.source_location_id or not self.destination_location_id:
                raise ValidationError("Transferências exigem origem e destino.")
            if self.source_location_id == self.destination_location_id:
                raise ValidationError("Origem e destino devem ser diferentes.")

    def save(self, *args, **kwargs):
        is_create = not self.pk
        previous = None
        if self.pk:
            previous = StockMovement.all_objects.filter(pk=self.pk).first()
            if previous and previous.status == DocumentStatus.POSTED:
                immutable_fields = (
                    "item_id",
                    "lot_id",
                    "source_location_id",
                    "destination_location_id",
                    "movement_type",
                    "quantity",
                    "status",
                    "tenant_id",
                )
                for field in immutable_fields:
                    if getattr(previous, field) != getattr(self, field):
                        raise ValidationError("Movimento WMS lançado é imutável.")

        if not self.name:
            self.name = self._default_name()

        self.full_clean()
        super().save(*args, **kwargs)

        if is_create and self.status == DocumentStatus.POSTED:
            self.apply_to_stock()

    def apply_to_stock(self):
        if self.status != DocumentStatus.POSTED:
            return

        if self.posted_at:
            return

        quantity = Decimal(self.quantity)
        with transaction.atomic():
            movement = StockMovement.all_objects.select_for_update().get(pk=self.pk)
            if movement.posted_at:
                return
            if movement.movement_type in {movement.MovementType.RECEIPT, movement.MovementType.ADJUSTMENT_IN}:
                StockLevel.adjust(
                    tenant=movement.tenant,
                    item=movement.item,
                    lot=movement.lot,
                    location=movement.destination_location,
                    quantity_delta=quantity,
                )
            elif movement.movement_type in {movement.MovementType.ISSUE, movement.MovementType.ADJUSTMENT_OUT}:
                StockLevel.adjust(
                    tenant=movement.tenant,
                    item=movement.item,
                    lot=movement.lot,
                    location=movement.source_location,
                    quantity_delta=-quantity,
                )
            elif movement.movement_type in {movement.MovementType.TRANSFER, movement.MovementType.COUNT_CORRECTION}:
                StockLevel.adjust(
                    tenant=movement.tenant,
                    item=movement.item,
                    lot=movement.lot,
                    location=movement.source_location,
                    quantity_delta=-quantity,
                )
                StockLevel.adjust(
                    tenant=movement.tenant,
                    item=movement.item,
                    lot=movement.lot,
                    location=movement.destination_location,
                    quantity_delta=quantity,
                )
            movement.posted_at = timezone.now()
            movement.save(update_fields=["posted_at", "updated_at"])

    def _default_name(self) -> str:
        item = self.item.sku if self.item_id else "item"
        return f"{self.get_movement_type_display()} {self.quantity} {item}"

    def __str__(self) -> str:
        return self.name or self._default_name()


class SalesOrder(CoreModel):
    prefix = "SO"

    order_number = models.CharField(db_column="order_number", max_length=64)
    customer_name = models.CharField(db_column="customer_name", max_length=180)
    customer_document = models.CharField(db_column="customer_document", max_length=80, blank=True, default="")
    customer_reference = models.CharField(db_column="customer_reference", max_length=120, blank=True, default="")
    requested_ship_date = models.DateField(db_column="requested_ship_date", null=True, blank=True)
    priority = models.PositiveSmallIntegerField(db_column="priority", default=5)
    status = models.CharField(
        db_column="status",
        max_length=24,
        choices=SalesOrderStatus.choices,
        default=SalesOrderStatus.DRAFT,
    )
    confirmed_at = models.DateTimeField(db_column="confirmed_at", null=True, blank=True)
    allocated_at = models.DateTimeField(db_column="allocated_at", null=True, blank=True)
    shipped_at = models.DateTimeField(db_column="shipped_at", null=True, blank=True)
    notes = models.TextField(db_column="notes", blank=True, default="")

    class Meta:
        db_table = "warehouse_sales_order"
        verbose_name = "Pedido de Venda"
        verbose_name_plural = "Pedidos de Venda"
        ordering = ["priority", "requested_ship_date", "-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "order_number"], name="warehouse_sales_order_number_uniq"),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "customer_name"]),
            models.Index(fields=["tenant", "requested_ship_date"]),
        ]

    def save(self, *args, **kwargs):
        if not self.name:
            self.name = f"Venda {self.order_number}"
        return super().save(*args, **kwargs)

    def confirm(self):
        if not self.pk:
            raise ValidationError("Guarde o pedido de venda antes de confirmar.")

        with transaction.atomic():
            order = SalesOrder.all_objects.select_for_update().get(pk=self.pk)
            if order.status == SalesOrderStatus.CANCELLED:
                raise ValidationError("Pedido de venda cancelado não pode ser confirmado.")
            if order.status != SalesOrderStatus.DRAFT:
                return order
            if not order.lines.exists():
                raise ValidationError("Inclua pelo menos uma linha no pedido de venda.")
            order.status = SalesOrderStatus.CONFIRMED
            order.confirmed_at = timezone.now()
            order.save(update_fields=["status", "confirmed_at", "updated_at"])
            return order

    def allocate(self):
        if not self.pk:
            raise ValidationError("Guarde o pedido de venda antes de reservar estoque.")

        if self.status == SalesOrderStatus.DRAFT:
            self.confirm()

        with transaction.atomic():
            order = SalesOrder.all_objects.select_for_update().get(pk=self.pk)
            if order.status in {SalesOrderStatus.CANCELLED, SalesOrderStatus.SHIPPED}:
                raise ValidationError("Pedido de venda fechado não pode reservar estoque.")

            lines = list(order.lines.select_related("item", "lot", "preferred_location").order_by("id"))
            if not lines:
                raise ValidationError("Inclua pelo menos uma linha no pedido de venda.")

            for line in lines:
                pending = line.pending_reservation_quantity
                if pending <= ZERO:
                    continue

                levels = (
                    StockLevel.objects.select_for_update()
                    .filter(tenant=order.tenant, item=line.item, quantity__gt=ZERO)
                    .filter(models.Q(lot__isnull=True) | models.Q(lot__status=WarehouseLot.LotStatus.AVAILABLE))
                    .filter(
                        models.Q(lot__isnull=True)
                        | models.Q(lot__expiration_date__isnull=True)
                        | models.Q(lot__expiration_date__gte=timezone.localdate())
                    )
                    .select_related("lot", "location")
                    .order_by(
                        models.F("lot__expiration_date").asc(nulls_last=True),
                        models.F("lot__received_at").asc(nulls_last=True),
                        "created_at",
                    )
                )
                if line.lot_id:
                    levels = levels.filter(lot=line.lot)
                if line.preferred_location_id:
                    levels = levels.filter(location=line.preferred_location)

                for level in levels:
                    available = StockLevel.available_quantity_for(
                        tenant=order.tenant,
                        item=line.item,
                        lot=level.lot,
                        location=level.location,
                    )
                    if available <= ZERO:
                        continue
                    quantity = min(pending, available)
                    StockReservation.reserve(
                        tenant=order.tenant,
                        sales_order=order,
                        sales_order_line=line,
                        item=line.item,
                        lot=level.lot,
                        location=level.location,
                        quantity=quantity,
                    )
                    pending -= quantity
                    if pending <= ZERO:
                        break

                if pending > ZERO:
                    raise ValidationError(
                        f"Estoque disponível insuficiente para {line.item.sku}: faltam {pending}."
                    )

            order.status = (
                SalesOrderStatus.PARTIALLY_SHIPPED
                if order.status == SalesOrderStatus.PARTIALLY_SHIPPED
                else SalesOrderStatus.ALLOCATED
            )
            order.allocated_at = timezone.now()
            order.save(update_fields=["status", "allocated_at", "updated_at"])
            return order

    def create_pick_list(self):
        if not self.pk:
            raise ValidationError("Guarde o pedido de venda antes de gerar separação.")

        if not self.active_reservations.exists():
            self.allocate()

        with transaction.atomic():
            order = SalesOrder.all_objects.select_for_update().get(pk=self.pk)
            if order.status in {SalesOrderStatus.CANCELLED, SalesOrderStatus.SHIPPED}:
                raise ValidationError("Pedido de venda fechado não pode gerar separação.")

            existing = order.pick_lists.exclude(status=PickListStatus.CANCELLED).order_by("-created_at").first()
            if existing:
                return existing

            reservations = list(
                order.active_reservations.select_related("sales_order_line", "item", "lot", "location").order_by("id")
            )
            if not reservations:
                raise ValidationError("Não há reservas ativas para separar.")

            pick = PickList.objects.create(
                tenant=order.tenant,
                sales_order=order,
                pick_number=f"PK-{order.order_number}",
                status=PickListStatus.OPEN,
            )
            for reservation in reservations:
                PickListLine.objects.create(
                    tenant=order.tenant,
                    pick_list=pick,
                    sales_order_line=reservation.sales_order_line,
                    reservation=reservation,
                    item=reservation.item,
                    lot=reservation.lot,
                    source_location=reservation.location,
                    quantity_to_pick=reservation.quantity,
                    quantity_picked=ZERO,
                )

            if order.status != SalesOrderStatus.PARTIALLY_SHIPPED:
                order.status = SalesOrderStatus.PICKING
                order.save(update_fields=["status", "updated_at"])
            return pick

    def create_shipment(self, *, post=False):
        if not self.pk:
            raise ValidationError("Guarde o pedido de venda antes de expedir.")

        if not self.active_reservations.exists():
            self.allocate()

        with transaction.atomic():
            order = SalesOrder.all_objects.select_for_update().get(pk=self.pk)
            if order.status in {SalesOrderStatus.CANCELLED, SalesOrderStatus.SHIPPED}:
                raise ValidationError("Pedido de venda fechado não pode gerar expedição.")

            shipment = order.shipments.filter(status=ShipmentStatus.DRAFT).order_by("-created_at").first()
            if not shipment:
                shipment = Shipment.objects.create(
                    tenant=order.tenant,
                    sales_order=order,
                    shipment_number=f"SHP-{order.order_number}-{order.shipments.count() + 1}",
                )
                reservations = list(
                    order.active_reservations.select_related(
                        "sales_order_line",
                        "item",
                        "lot",
                        "location",
                    ).order_by("id")
                )
                if not reservations:
                    raise ValidationError("Não há reservas ativas para expedir.")
                for reservation in reservations:
                    ShipmentLine.objects.create(
                        tenant=order.tenant,
                        shipment=shipment,
                        sales_order_line=reservation.sales_order_line,
                        reservation=reservation,
                        item=reservation.item,
                        lot=reservation.lot,
                        source_location=reservation.location,
                        quantity=reservation.quantity,
                    )

        if post:
            return shipment.post()
        return shipment

    def ship(self):
        return self.create_shipment(post=True)

    def cancel(self):
        if not self.pk:
            raise ValidationError("Guarde o pedido de venda antes de cancelar.")

        with transaction.atomic():
            order = SalesOrder.all_objects.select_for_update().get(pk=self.pk)
            if order.status == SalesOrderStatus.SHIPPED:
                raise ValidationError("Pedido expedido não pode ser cancelado.")
            if order.lines.filter(shipped_quantity__gt=ZERO).exists():
                raise ValidationError("Pedido com expedição parcial não pode ser cancelado.")
            for reservation in order.active_reservations.select_for_update():
                reservation.release(status=ReservationStatus.CANCELLED)
            order.status = SalesOrderStatus.CANCELLED
            order.save(update_fields=["status", "updated_at"])
            return order

    def refresh_fulfillment_status(self):
        lines = list(self.lines.all())
        if not lines:
            return self
        total_ordered = sum((Decimal(line.ordered_quantity or ZERO) for line in lines), ZERO)
        total_shipped = sum((Decimal(line.shipped_quantity or ZERO) for line in lines), ZERO)
        total_reserved = sum((Decimal(line.reserved_quantity or ZERO) for line in lines), ZERO)

        if total_ordered > ZERO and total_shipped >= total_ordered:
            self.status = SalesOrderStatus.SHIPPED
            self.shipped_at = self.shipped_at or timezone.now()
            self.save(update_fields=["status", "shipped_at", "updated_at"])
            return self
        if total_shipped > ZERO:
            self.status = SalesOrderStatus.PARTIALLY_SHIPPED
        elif total_reserved > ZERO and self.status != SalesOrderStatus.PICKING:
            self.status = SalesOrderStatus.ALLOCATED
        elif self.status not in {SalesOrderStatus.DRAFT, SalesOrderStatus.CANCELLED}:
            self.status = SalesOrderStatus.CONFIRMED
        self.save(update_fields=["status", "updated_at"])
        return self

    def __str__(self) -> str:
        return f"{self.order_number} - {self.customer_name}"

    @property
    def active_reservations(self):
        return self.reservations.filter(status=ReservationStatus.ACTIVE)


class SalesOrderLine(NoNameCoreModel):
    prefix = "SOL"

    sales_order = models.ForeignKey(
        "warehouse.SalesOrder",
        db_column="sales_order_id",
        on_delete=models.CASCADE,
        related_name="lines",
    )
    item = models.ForeignKey(
        "warehouse.WarehouseItem",
        db_column="item_id",
        on_delete=models.PROTECT,
        related_name="sales_order_lines",
    )
    lot = models.ForeignKey(
        "warehouse.WarehouseLot",
        db_column="lot_id",
        on_delete=models.PROTECT,
        related_name="sales_order_lines",
        null=True,
        blank=True,
    )
    preferred_location = models.ForeignKey(
        "warehouse.StorageLocation",
        db_column="preferred_location_id",
        on_delete=models.PROTECT,
        related_name="preferred_sales_lines",
        null=True,
        blank=True,
    )
    ordered_quantity = models.DecimalField(
        db_column="ordered_quantity",
        max_digits=14,
        decimal_places=4,
        validators=[MIN_QUANTITY],
    )
    reserved_quantity = models.DecimalField(
        db_column="reserved_quantity",
        max_digits=14,
        decimal_places=4,
        default=ZERO,
        validators=[MIN_NON_NEGATIVE],
    )
    shipped_quantity = models.DecimalField(
        db_column="shipped_quantity",
        max_digits=14,
        decimal_places=4,
        default=ZERO,
        validators=[MIN_NON_NEGATIVE],
    )
    unit_price = models.DecimalField(
        db_column="unit_price",
        max_digits=14,
        decimal_places=4,
        default=ZERO,
        validators=[MIN_NON_NEGATIVE],
    )

    class Meta:
        db_table = "warehouse_sales_order_line"
        verbose_name = "Linha de Pedido de Venda"
        verbose_name_plural = "Linhas de Pedidos de Venda"
        ordering = ["sales_order", "id"]
        indexes = [
            models.Index(fields=["tenant", "sales_order"]),
            models.Index(fields=["tenant", "item"]),
            models.Index(fields=["tenant", "lot"]),
        ]

    @property
    def pending_reservation_quantity(self) -> Decimal:
        return max(
            Decimal(self.ordered_quantity or ZERO)
            - Decimal(self.shipped_quantity or ZERO)
            - Decimal(self.reserved_quantity or ZERO),
            ZERO,
        )

    @property
    def pending_shipment_quantity(self) -> Decimal:
        return max(Decimal(self.ordered_quantity or ZERO) - Decimal(self.shipped_quantity or ZERO), ZERO)

    def clean(self):
        super().clean()
        if self.sales_order_id and self.tenant_id and self.sales_order.tenant_id != self.tenant_id:
            raise ValidationError({"sales_order": "Pedido e linha devem pertencer ao mesmo tenant."})
        if self.item_id and self.tenant_id and self.item.tenant_id != self.tenant_id:
            raise ValidationError({"item": "Item e linha devem pertencer ao mesmo tenant."})
        if self.lot_id and self.tenant_id and self.lot.tenant_id != self.tenant_id:
            raise ValidationError({"lot": "Lote e linha devem pertencer ao mesmo tenant."})
        if self.lot_id and self.item_id and self.lot.item_id != self.item_id:
            raise ValidationError({"lot": "Lote não pertence ao item selecionado."})
        if self.preferred_location_id and self.tenant_id and self.preferred_location.tenant_id != self.tenant_id:
            raise ValidationError({"preferred_location": "Localização preferida deve pertencer ao mesmo tenant."})
        if self.reserved_quantity > self.ordered_quantity:
            raise ValidationError({"reserved_quantity": "Reservado não pode exceder o pedido."})
        if self.shipped_quantity > self.ordered_quantity:
            raise ValidationError({"shipped_quantity": "Expedido não pode exceder o pedido."})

    def __str__(self) -> str:
        return f"{self.sales_order.order_number} / {self.item.sku}"


class StockReservation(NoNameCoreModel):
    prefix = "RSV"

    sales_order = models.ForeignKey(
        "warehouse.SalesOrder",
        db_column="sales_order_id",
        on_delete=models.CASCADE,
        related_name="reservations",
    )
    sales_order_line = models.ForeignKey(
        "warehouse.SalesOrderLine",
        db_column="sales_order_line_id",
        on_delete=models.CASCADE,
        related_name="reservations",
    )
    item = models.ForeignKey(
        "warehouse.WarehouseItem",
        db_column="item_id",
        on_delete=models.PROTECT,
        related_name="stock_reservations",
    )
    lot = models.ForeignKey(
        "warehouse.WarehouseLot",
        db_column="lot_id",
        on_delete=models.PROTECT,
        related_name="stock_reservations",
        null=True,
        blank=True,
    )
    location = models.ForeignKey(
        "warehouse.StorageLocation",
        db_column="location_id",
        on_delete=models.PROTECT,
        related_name="stock_reservations",
    )
    quantity = models.DecimalField(
        db_column="quantity",
        max_digits=14,
        decimal_places=4,
        validators=[MIN_QUANTITY],
    )
    status = models.CharField(
        db_column="status",
        max_length=16,
        choices=ReservationStatus.choices,
        default=ReservationStatus.ACTIVE,
    )
    reserved_at = models.DateTimeField(db_column="reserved_at", default=timezone.now)
    released_at = models.DateTimeField(db_column="released_at", null=True, blank=True)
    consumed_at = models.DateTimeField(db_column="consumed_at", null=True, blank=True)

    class Meta:
        db_table = "warehouse_stock_reservation"
        verbose_name = "Reserva de Estoque"
        verbose_name_plural = "Reservas de Estoque"
        ordering = ["-reserved_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "item", "location"]),
            models.Index(fields=["tenant", "sales_order"]),
        ]

    @classmethod
    def active_quantity_for(cls, *, tenant, item, location, lot=None) -> Decimal:
        reserved = (
            cls.objects.filter(
                tenant=tenant,
                item=item,
                location=location,
                lot=lot,
                status=ReservationStatus.ACTIVE,
            ).aggregate(total=models.Sum("quantity"))["total"]
            or ZERO
        )
        return Decimal(reserved or ZERO)

    @classmethod
    def reserve(cls, *, tenant, sales_order, sales_order_line, item, location, quantity: Decimal, lot=None):
        quantity = Decimal(quantity)
        if quantity <= ZERO:
            raise ValidationError("Quantidade de reserva deve ser maior que zero.")

        with transaction.atomic():
            level = (
                StockLevel.objects.select_for_update()
                .filter(tenant=tenant, item=item, lot=lot, location=location)
                .first()
            )
            physical = Decimal(level.quantity if level else ZERO)
            reserved = cls.active_quantity_for(tenant=tenant, item=item, lot=lot, location=location)
            available = physical - reserved
            if available < quantity:
                raise ValidationError(
                    f"Estoque disponível insuficiente em {location}: disponível {available}, reserva {quantity}."
                )

            line = SalesOrderLine.all_objects.select_for_update().get(pk=sales_order_line.pk)
            if line.pending_reservation_quantity < quantity:
                raise ValidationError("Reserva excede a quantidade pendente do pedido.")

            reservation = cls(
                tenant=tenant,
                sales_order=sales_order,
                sales_order_line=line,
                item=item,
                lot=lot,
                location=location,
                quantity=quantity,
                status=ReservationStatus.ACTIVE,
            )
            reservation.full_clean()
            reservation.save()

            line.reserved_quantity = Decimal(line.reserved_quantity or ZERO) + quantity
            line.save(update_fields=["reserved_quantity", "updated_at"])
            return reservation

    def clean(self):
        super().clean()
        if self.sales_order_id and self.tenant_id and self.sales_order.tenant_id != self.tenant_id:
            raise ValidationError({"sales_order": "Pedido e reserva devem pertencer ao mesmo tenant."})
        if self.sales_order_line_id and self.tenant_id and self.sales_order_line.tenant_id != self.tenant_id:
            raise ValidationError({"sales_order_line": "Linha e reserva devem pertencer ao mesmo tenant."})
        if self.sales_order_line_id and self.sales_order_id and self.sales_order_line.sales_order_id != self.sales_order_id:
            raise ValidationError({"sales_order_line": "Linha não pertence ao pedido informado."})
        if self.item_id and self.tenant_id and self.item.tenant_id != self.tenant_id:
            raise ValidationError({"item": "Item e reserva devem pertencer ao mesmo tenant."})
        if self.sales_order_line_id and self.item_id and self.sales_order_line.item_id != self.item_id:
            raise ValidationError({"item": "Item da reserva deve ser igual ao item da linha."})
        if self.lot_id and self.tenant_id and self.lot.tenant_id != self.tenant_id:
            raise ValidationError({"lot": "Lote e reserva devem pertencer ao mesmo tenant."})
        if self.lot_id and self.item_id and self.lot.item_id != self.item_id:
            raise ValidationError({"lot": "Lote não pertence ao item selecionado."})
        if self.location_id and self.tenant_id and self.location.tenant_id != self.tenant_id:
            raise ValidationError({"location": "Localização e reserva devem pertencer ao mesmo tenant."})

    def release(self, *, status=ReservationStatus.RELEASED):
        if self.status != ReservationStatus.ACTIVE:
            return self
        if status not in {ReservationStatus.RELEASED, ReservationStatus.CANCELLED}:
            raise ValidationError("Estado inválido para liberar reserva.")

        with transaction.atomic():
            reservation = StockReservation.all_objects.select_for_update().get(pk=self.pk)
            if reservation.status != ReservationStatus.ACTIVE:
                return reservation
            line = SalesOrderLine.all_objects.select_for_update().get(pk=reservation.sales_order_line_id)
            line.reserved_quantity = max(Decimal(line.reserved_quantity or ZERO) - Decimal(reservation.quantity), ZERO)
            line.save(update_fields=["reserved_quantity", "updated_at"])
            reservation.status = status
            reservation.released_at = timezone.now()
            reservation.save(update_fields=["status", "released_at", "updated_at"])
            return reservation

    def consume(self, quantity: Decimal):
        quantity = Decimal(quantity)
        if quantity <= ZERO:
            raise ValidationError("Quantidade consumida deve ser maior que zero.")

        with transaction.atomic():
            reservation = StockReservation.all_objects.select_for_update().get(pk=self.pk)
            if reservation.status != ReservationStatus.ACTIVE:
                raise ValidationError("Apenas reservas ativas podem ser consumidas.")
            if quantity > reservation.quantity:
                raise ValidationError("Consumo excede a quantidade reservada.")

            line = SalesOrderLine.all_objects.select_for_update().get(pk=reservation.sales_order_line_id)
            line.reserved_quantity = max(Decimal(line.reserved_quantity or ZERO) - quantity, ZERO)
            line.save(update_fields=["reserved_quantity", "updated_at"])

            if quantity == reservation.quantity:
                reservation.status = ReservationStatus.CONSUMED
                reservation.consumed_at = timezone.now()
                reservation.save(update_fields=["status", "consumed_at", "updated_at"])
            else:
                reservation.quantity = Decimal(reservation.quantity or ZERO) - quantity
                reservation.save(update_fields=["quantity", "updated_at"])
            return reservation

    def __str__(self) -> str:
        return f"{self.sales_order.order_number} / {self.item.sku} / {self.quantity}"


class PickList(CoreModel):
    prefix = "PK"

    pick_number = models.CharField(db_column="pick_number", max_length=64)
    sales_order = models.ForeignKey(
        "warehouse.SalesOrder",
        db_column="sales_order_id",
        on_delete=models.PROTECT,
        related_name="pick_lists",
    )
    status = models.CharField(
        db_column="status",
        max_length=16,
        choices=PickListStatus.choices,
        default=PickListStatus.DRAFT,
    )
    started_at = models.DateTimeField(db_column="started_at", null=True, blank=True)
    completed_at = models.DateTimeField(db_column="completed_at", null=True, blank=True)
    notes = models.TextField(db_column="notes", blank=True, default="")

    class Meta:
        db_table = "warehouse_pick_list"
        verbose_name = "Lista de Separação"
        verbose_name_plural = "Listas de Separação"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "pick_number"], name="warehouse_pick_list_number_uniq"),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "sales_order"]),
        ]

    def save(self, *args, **kwargs):
        if not self.name:
            self.name = f"Separação {self.pick_number}"
        return super().save(*args, **kwargs)

    def mark_picked(self):
        if not self.pk:
            raise ValidationError("Guarde a lista de separação antes de concluir.")

        with transaction.atomic():
            pick = PickList.all_objects.select_for_update().get(pk=self.pk)
            if pick.status == PickListStatus.CANCELLED:
                raise ValidationError("Lista de separação cancelada não pode ser concluída.")
            lines = list(pick.lines.select_for_update())
            if not lines:
                raise ValidationError("Inclua pelo menos uma linha na separação.")
            for line in lines:
                if line.quantity_picked <= ZERO:
                    line.quantity_picked = line.quantity_to_pick
                    line.save(update_fields=["quantity_picked", "updated_at"])
                if line.quantity_picked > line.quantity_to_pick:
                    raise ValidationError("Quantidade separada não pode exceder a quantidade a separar.")
            pick.status = PickListStatus.PICKED
            pick.completed_at = timezone.now()
            pick.save(update_fields=["status", "completed_at", "updated_at"])
            return pick

    def __str__(self) -> str:
        return self.pick_number


class PickListLine(NoNameCoreModel):
    prefix = "PKL"

    pick_list = models.ForeignKey(
        "warehouse.PickList",
        db_column="pick_list_id",
        on_delete=models.CASCADE,
        related_name="lines",
    )
    sales_order_line = models.ForeignKey(
        "warehouse.SalesOrderLine",
        db_column="sales_order_line_id",
        on_delete=models.PROTECT,
        related_name="pick_lines",
    )
    reservation = models.ForeignKey(
        "warehouse.StockReservation",
        db_column="reservation_id",
        on_delete=models.PROTECT,
        related_name="pick_lines",
    )
    item = models.ForeignKey(
        "warehouse.WarehouseItem",
        db_column="item_id",
        on_delete=models.PROTECT,
        related_name="pick_lines",
    )
    lot = models.ForeignKey(
        "warehouse.WarehouseLot",
        db_column="lot_id",
        on_delete=models.PROTECT,
        related_name="pick_lines",
        null=True,
        blank=True,
    )
    source_location = models.ForeignKey(
        "warehouse.StorageLocation",
        db_column="source_location_id",
        on_delete=models.PROTECT,
        related_name="pick_lines",
    )
    quantity_to_pick = models.DecimalField(
        db_column="quantity_to_pick",
        max_digits=14,
        decimal_places=4,
        validators=[MIN_QUANTITY],
    )
    quantity_picked = models.DecimalField(
        db_column="quantity_picked",
        max_digits=14,
        decimal_places=4,
        default=ZERO,
        validators=[MIN_NON_NEGATIVE],
    )

    class Meta:
        db_table = "warehouse_pick_list_line"
        verbose_name = "Linha de Separação"
        verbose_name_plural = "Linhas de Separação"
        ordering = ["pick_list", "id"]
        indexes = [
            models.Index(fields=["tenant", "pick_list"]),
            models.Index(fields=["tenant", "item"]),
            models.Index(fields=["tenant", "source_location"]),
        ]

    def clean(self):
        super().clean()
        if self.pick_list_id and self.tenant_id and self.pick_list.tenant_id != self.tenant_id:
            raise ValidationError({"pick_list": "Separação e linha devem pertencer ao mesmo tenant."})
        if self.sales_order_line_id and self.tenant_id and self.sales_order_line.tenant_id != self.tenant_id:
            raise ValidationError({"sales_order_line": "Linha do pedido deve pertencer ao mesmo tenant."})
        if self.reservation_id and self.tenant_id and self.reservation.tenant_id != self.tenant_id:
            raise ValidationError({"reservation": "Reserva deve pertencer ao mesmo tenant."})
        if self.item_id and self.tenant_id and self.item.tenant_id != self.tenant_id:
            raise ValidationError({"item": "Item e linha devem pertencer ao mesmo tenant."})
        if self.lot_id and self.item_id and self.lot.item_id != self.item_id:
            raise ValidationError({"lot": "Lote não pertence ao item selecionado."})
        if self.source_location_id and self.tenant_id and self.source_location.tenant_id != self.tenant_id:
            raise ValidationError({"source_location": "Origem deve pertencer ao mesmo tenant."})
        if self.quantity_picked > self.quantity_to_pick:
            raise ValidationError({"quantity_picked": "Separado não pode exceder a quantidade prevista."})

    def __str__(self) -> str:
        return f"{self.pick_list.pick_number} / {self.item.sku}"


class Shipment(CoreModel):
    prefix = "SHP"

    shipment_number = models.CharField(db_column="shipment_number", max_length=64)
    sales_order = models.ForeignKey(
        "warehouse.SalesOrder",
        db_column="sales_order_id",
        on_delete=models.PROTECT,
        related_name="shipments",
    )
    carrier_name = models.CharField(db_column="carrier_name", max_length=120, blank=True, default="")
    tracking_number = models.CharField(db_column="tracking_number", max_length=120, blank=True, default="")
    status = models.CharField(
        db_column="status",
        max_length=16,
        choices=ShipmentStatus.choices,
        default=ShipmentStatus.DRAFT,
    )
    shipped_at = models.DateTimeField(db_column="shipped_at", null=True, blank=True)
    notes = models.TextField(db_column="notes", blank=True, default="")

    class Meta:
        db_table = "warehouse_shipment"
        verbose_name = "Expedição"
        verbose_name_plural = "Expedições"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "shipment_number"], name="warehouse_shipment_number_uniq"),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "sales_order"]),
        ]

    def save(self, *args, **kwargs):
        if not self.name:
            self.name = f"Expedição {self.shipment_number}"
        return super().save(*args, **kwargs)

    def post(self):
        if not self.pk:
            raise ValidationError("Guarde a expedição antes de lançar.")

        with transaction.atomic():
            shipment = Shipment.all_objects.select_for_update().get(pk=self.pk)
            if shipment.status == ShipmentStatus.SHIPPED:
                return shipment
            if shipment.status == ShipmentStatus.CANCELLED:
                raise ValidationError("Expedição cancelada não pode ser lançada.")

            lines = list(
                shipment.lines.select_related(
                    "sales_order_line",
                    "reservation",
                    "item",
                    "lot",
                    "source_location",
                ).order_by("id")
            )
            if not lines:
                raise ValidationError("Inclua pelo menos uma linha na expedição.")

            for line in lines:
                reservation = StockReservation.all_objects.select_for_update().get(pk=line.reservation_id)
                if reservation.status != ReservationStatus.ACTIVE:
                    raise ValidationError("Reserva da expedição não está ativa.")
                if Decimal(line.quantity or ZERO) > Decimal(reservation.quantity or ZERO):
                    raise ValidationError("Expedição excede a reserva disponível.")

                StockMovement.objects.create(
                    tenant=shipment.tenant,
                    name=f"Expedição {shipment.shipment_number} - {line.item.sku}",
                    item=line.item,
                    lot=line.lot,
                    source_location=line.source_location,
                    movement_type=StockMovement.MovementType.ISSUE,
                    quantity=line.quantity,
                    reference_document=shipment.shipment_number,
                    reason="Expedição de pedido de venda",
                    status=DocumentStatus.POSTED,
                )
                reservation.consume(line.quantity)

                sales_line = SalesOrderLine.all_objects.select_for_update().get(pk=line.sales_order_line_id)
                sales_line.shipped_quantity = Decimal(sales_line.shipped_quantity or ZERO) + Decimal(line.quantity)
                if sales_line.shipped_quantity > sales_line.ordered_quantity:
                    raise ValidationError("Expedição excede a quantidade pedida.")
                sales_line.save(update_fields=["shipped_quantity", "updated_at"])

            shipment.status = ShipmentStatus.SHIPPED
            shipment.shipped_at = timezone.now()
            shipment.save(update_fields=["status", "shipped_at", "updated_at"])

            order = SalesOrder.all_objects.select_for_update().get(pk=shipment.sales_order_id)
            order.refresh_fulfillment_status()
            return shipment

    def __str__(self) -> str:
        return self.shipment_number


class ShipmentLine(NoNameCoreModel):
    prefix = "SPL"

    shipment = models.ForeignKey(
        "warehouse.Shipment",
        db_column="shipment_id",
        on_delete=models.CASCADE,
        related_name="lines",
    )
    sales_order_line = models.ForeignKey(
        "warehouse.SalesOrderLine",
        db_column="sales_order_line_id",
        on_delete=models.PROTECT,
        related_name="shipment_lines",
    )
    reservation = models.ForeignKey(
        "warehouse.StockReservation",
        db_column="reservation_id",
        on_delete=models.PROTECT,
        related_name="shipment_lines",
    )
    item = models.ForeignKey(
        "warehouse.WarehouseItem",
        db_column="item_id",
        on_delete=models.PROTECT,
        related_name="shipment_lines",
    )
    lot = models.ForeignKey(
        "warehouse.WarehouseLot",
        db_column="lot_id",
        on_delete=models.PROTECT,
        related_name="shipment_lines",
        null=True,
        blank=True,
    )
    source_location = models.ForeignKey(
        "warehouse.StorageLocation",
        db_column="source_location_id",
        on_delete=models.PROTECT,
        related_name="shipment_lines",
    )
    quantity = models.DecimalField(db_column="quantity", max_digits=14, decimal_places=4, validators=[MIN_QUANTITY])

    class Meta:
        db_table = "warehouse_shipment_line"
        verbose_name = "Linha de Expedição"
        verbose_name_plural = "Linhas de Expedição"
        ordering = ["shipment", "id"]
        indexes = [
            models.Index(fields=["tenant", "shipment"]),
            models.Index(fields=["tenant", "item"]),
            models.Index(fields=["tenant", "source_location"]),
        ]

    def clean(self):
        super().clean()
        if self.shipment_id and self.tenant_id and self.shipment.tenant_id != self.tenant_id:
            raise ValidationError({"shipment": "Expedição e linha devem pertencer ao mesmo tenant."})
        if self.sales_order_line_id and self.tenant_id and self.sales_order_line.tenant_id != self.tenant_id:
            raise ValidationError({"sales_order_line": "Linha do pedido deve pertencer ao mesmo tenant."})
        if self.reservation_id and self.tenant_id and self.reservation.tenant_id != self.tenant_id:
            raise ValidationError({"reservation": "Reserva deve pertencer ao mesmo tenant."})
        if self.item_id and self.tenant_id and self.item.tenant_id != self.tenant_id:
            raise ValidationError({"item": "Item e linha devem pertencer ao mesmo tenant."})
        if self.lot_id and self.item_id and self.lot.item_id != self.item_id:
            raise ValidationError({"lot": "Lote não pertence ao item selecionado."})
        if self.source_location_id and self.tenant_id and self.source_location.tenant_id != self.tenant_id:
            raise ValidationError({"source_location": "Origem deve pertencer ao mesmo tenant."})
        if self.reservation_id and self.quantity > self.reservation.quantity:
            raise ValidationError({"quantity": "Quantidade não pode exceder a reserva."})

    def __str__(self) -> str:
        return f"{self.shipment.shipment_number} / {self.item.sku}"


class ReplenishmentPlan(CoreModel):
    prefix = "RPL"

    plan_number = models.CharField(db_column="plan_number", max_length=64)
    warehouse = models.ForeignKey(
        "warehouse.Warehouse",
        db_column="warehouse_id",
        on_delete=models.PROTECT,
        related_name="replenishment_plans",
        null=True,
        blank=True,
        help_text="Quando vazio, o plano considera todos os armazéns do tenant.",
    )
    supplier_name = models.CharField(db_column="supplier_name", max_length=180, default="Fornecedor padrão")
    status = models.CharField(
        db_column="status",
        max_length=16,
        choices=ReplenishmentStatus.choices,
        default=ReplenishmentStatus.DRAFT,
    )
    generated_at = models.DateTimeField(db_column="generated_at", null=True, blank=True)
    purchase_order = models.ForeignKey(
        "warehouse.PurchaseOrder",
        db_column="purchase_order_id",
        on_delete=models.PROTECT,
        related_name="replenishment_plans",
        null=True,
        blank=True,
    )
    notes = models.TextField(db_column="notes", blank=True, default="")

    class Meta:
        db_table = "warehouse_replenishment_plan"
        verbose_name = "Plano de Reposição"
        verbose_name_plural = "Planos de Reposição"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "plan_number"], name="warehouse_replenishment_plan_number_uniq"),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "warehouse"]),
            models.Index(fields=["tenant", "generated_at"]),
        ]

    def clean(self):
        super().clean()
        if self.warehouse_id and self.tenant_id and self.warehouse.tenant_id != self.tenant_id:
            raise ValidationError({"warehouse": "Armazém e plano devem pertencer ao mesmo tenant."})
        if self.purchase_order_id and self.tenant_id and self.purchase_order.tenant_id != self.tenant_id:
            raise ValidationError({"purchase_order": "Pedido de compra e plano devem pertencer ao mesmo tenant."})

    def save(self, *args, **kwargs):
        if not self.name:
            self.name = f"Reposição {self.plan_number}"
        return super().save(*args, **kwargs)

    def generate(self):
        if not self.pk:
            raise ValidationError("Guarde o plano de reposição antes de gerar sugestões.")

        with transaction.atomic():
            plan = ReplenishmentPlan.all_objects.select_for_update().get(pk=self.pk)
            if plan.status in {ReplenishmentStatus.ORDERED, ReplenishmentStatus.CANCELLED}:
                raise ValidationError("Plano fechado não pode gerar novas sugestões.")
            if plan.suggestions.exists():
                return plan

            items = WarehouseItem.objects.filter(tenant=plan.tenant, status=WarehouseStatus.ACTIVE).order_by("name")
            for item in items:
                reorder_point = Decimal(item.reorder_point or ZERO)
                if reorder_point <= ZERO:
                    continue

                levels = StockLevel.objects.filter(tenant=plan.tenant, item=item).select_related("location")
                if plan.warehouse_id:
                    levels = levels.filter(location__warehouse=plan.warehouse)

                current = sum((Decimal(level.quantity or ZERO) for level in levels), ZERO)
                reserved = sum((Decimal(level.reserved_quantity or ZERO) for level in levels), ZERO)
                available = max(current - reserved, ZERO)
                if available >= reorder_point:
                    continue

                shortage = reorder_point - available
                recommended = max(Decimal(item.reorder_quantity or ZERO), shortage)
                if recommended <= ZERO:
                    continue

                ReplenishmentSuggestion.objects.create(
                    tenant=plan.tenant,
                    plan=plan,
                    item=item,
                    warehouse=plan.warehouse,
                    current_quantity=current,
                    reserved_quantity=reserved,
                    available_quantity=available,
                    reorder_point=reorder_point,
                    recommended_quantity=recommended,
                )

            plan.status = ReplenishmentStatus.GENERATED
            plan.generated_at = timezone.now()
            plan.save(update_fields=["status", "generated_at", "updated_at"])
            return plan

    def create_purchase_order(self):
        if not self.pk:
            raise ValidationError("Guarde o plano de reposição antes de criar compra.")

        if not self.suggestions.exists():
            self.generate()

        with transaction.atomic():
            plan = ReplenishmentPlan.all_objects.select_for_update().get(pk=self.pk)
            if plan.status == ReplenishmentStatus.ORDERED and plan.purchase_order_id:
                return plan.purchase_order
            if plan.status == ReplenishmentStatus.CANCELLED:
                raise ValidationError("Plano cancelado não pode criar pedido de compra.")

            suggestions = list(
                plan.suggestions.select_for_update()
                .filter(status=ReplenishmentSuggestionStatus.OPEN, recommended_quantity__gt=ZERO)
                .select_related("item")
                .order_by("item__name")
            )
            if not suggestions:
                raise ValidationError("Não há sugestões abertas para converter em compra.")

            base_number = f"PO-{plan.plan_number}"
            order_number = base_number
            suffix = 1
            while PurchaseOrder.objects.filter(tenant=plan.tenant, order_number=order_number).exists():
                suffix += 1
                order_number = f"{base_number}-{suffix}"

            purchase = PurchaseOrder.objects.create(
                tenant=plan.tenant,
                order_number=order_number,
                supplier_name=plan.supplier_name,
                notes=f"Gerado automaticamente pelo plano de reposição {plan.plan_number}.",
            )
            for suggestion in suggestions:
                PurchaseOrderLine.objects.create(
                    tenant=plan.tenant,
                    purchase_order=purchase,
                    item=suggestion.item,
                    ordered_quantity=suggestion.recommended_quantity,
                    unit_cost=suggestion.estimated_unit_cost,
                )
                suggestion.status = ReplenishmentSuggestionStatus.ORDERED
                suggestion.save(update_fields=["status", "updated_at"])

            plan.purchase_order = purchase
            plan.status = ReplenishmentStatus.ORDERED
            plan.save(update_fields=["purchase_order", "status", "updated_at"])
            return purchase

    def __str__(self) -> str:
        return self.plan_number


class ReplenishmentSuggestion(NoNameCoreModel):
    prefix = "RPS"

    plan = models.ForeignKey(
        "warehouse.ReplenishmentPlan",
        db_column="plan_id",
        on_delete=models.CASCADE,
        related_name="suggestions",
    )
    item = models.ForeignKey(
        "warehouse.WarehouseItem",
        db_column="item_id",
        on_delete=models.PROTECT,
        related_name="replenishment_suggestions",
    )
    warehouse = models.ForeignKey(
        "warehouse.Warehouse",
        db_column="warehouse_id",
        on_delete=models.PROTECT,
        related_name="replenishment_suggestions",
        null=True,
        blank=True,
    )
    current_quantity = models.DecimalField(
        db_column="current_quantity",
        max_digits=14,
        decimal_places=4,
        default=ZERO,
        validators=[MIN_NON_NEGATIVE],
    )
    reserved_quantity = models.DecimalField(
        db_column="reserved_quantity",
        max_digits=14,
        decimal_places=4,
        default=ZERO,
        validators=[MIN_NON_NEGATIVE],
    )
    available_quantity = models.DecimalField(
        db_column="available_quantity",
        max_digits=14,
        decimal_places=4,
        default=ZERO,
        validators=[MIN_NON_NEGATIVE],
    )
    reorder_point = models.DecimalField(
        db_column="reorder_point",
        max_digits=14,
        decimal_places=4,
        default=ZERO,
        validators=[MIN_NON_NEGATIVE],
    )
    recommended_quantity = models.DecimalField(
        db_column="recommended_quantity",
        max_digits=14,
        decimal_places=4,
        validators=[MIN_QUANTITY],
    )
    estimated_unit_cost = models.DecimalField(
        db_column="estimated_unit_cost",
        max_digits=14,
        decimal_places=4,
        default=ZERO,
        validators=[MIN_NON_NEGATIVE],
    )
    status = models.CharField(
        db_column="status",
        max_length=16,
        choices=ReplenishmentSuggestionStatus.choices,
        default=ReplenishmentSuggestionStatus.OPEN,
    )

    class Meta:
        db_table = "warehouse_replenishment_suggestion"
        verbose_name = "Sugestão de Reposição"
        verbose_name_plural = "Sugestões de Reposição"
        ordering = ["plan", "item__name"]
        indexes = [
            models.Index(fields=["tenant", "plan"]),
            models.Index(fields=["tenant", "item"]),
            models.Index(fields=["tenant", "status"]),
        ]

    def clean(self):
        super().clean()
        if self.plan_id and self.tenant_id and self.plan.tenant_id != self.tenant_id:
            raise ValidationError({"plan": "Plano e sugestão devem pertencer ao mesmo tenant."})
        if self.item_id and self.tenant_id and self.item.tenant_id != self.tenant_id:
            raise ValidationError({"item": "Item e sugestão devem pertencer ao mesmo tenant."})
        if self.warehouse_id and self.tenant_id and self.warehouse.tenant_id != self.tenant_id:
            raise ValidationError({"warehouse": "Armazém e sugestão devem pertencer ao mesmo tenant."})

    def __str__(self) -> str:
        return f"{self.plan.plan_number} / {self.item.sku} / {self.recommended_quantity}"


class PurchaseOrder(CoreModel):
    prefix = "PO"

    order_number = models.CharField(db_column="order_number", max_length=64)
    supplier_name = models.CharField(db_column="supplier_name", max_length=180)
    supplier_document = models.CharField(db_column="supplier_document", max_length=80, blank=True, default="")
    ordered_at = models.DateField(db_column="ordered_at", default=timezone.localdate)
    expected_at = models.DateField(db_column="expected_at", null=True, blank=True)
    status = models.CharField(
        db_column="status",
        max_length=16,
        choices=DocumentStatus.choices,
        default=DocumentStatus.DRAFT,
    )
    notes = models.TextField(db_column="notes", blank=True, default="")

    class Meta:
        db_table = "warehouse_purchase_order"
        verbose_name = "Pedido de Compra"
        verbose_name_plural = "Pedidos de Compra"
        ordering = ["-ordered_at", "-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "order_number"], name="warehouse_purchase_order_number_uniq"),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "supplier_name"]),
        ]

    def save(self, *args, **kwargs):
        if not self.name:
            self.name = f"Compra {self.order_number}"
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.order_number} - {self.supplier_name}"


class PurchaseOrderLine(NoNameCoreModel):
    prefix = "POL"

    purchase_order = models.ForeignKey(
        "warehouse.PurchaseOrder",
        db_column="purchase_order_id",
        on_delete=models.CASCADE,
        related_name="lines",
    )
    item = models.ForeignKey(
        "warehouse.WarehouseItem",
        db_column="item_id",
        on_delete=models.PROTECT,
        related_name="purchase_order_lines",
    )
    ordered_quantity = models.DecimalField(
        db_column="ordered_quantity",
        max_digits=14,
        decimal_places=4,
        validators=[MIN_QUANTITY],
    )
    received_quantity = models.DecimalField(
        db_column="received_quantity",
        max_digits=14,
        decimal_places=4,
        default=ZERO,
        validators=[MIN_NON_NEGATIVE],
    )
    unit_cost = models.DecimalField(
        db_column="unit_cost",
        max_digits=14,
        decimal_places=4,
        default=ZERO,
        validators=[MIN_NON_NEGATIVE],
    )

    class Meta:
        db_table = "warehouse_purchase_order_line"
        verbose_name = "Linha de Pedido de Compra"
        verbose_name_plural = "Linhas de Pedidos de Compra"
        ordering = ["purchase_order", "id"]
        indexes = [
            models.Index(fields=["tenant", "purchase_order"]),
            models.Index(fields=["tenant", "item"]),
        ]

    @property
    def pending_quantity(self) -> Decimal:
        return max(Decimal(self.ordered_quantity or ZERO) - Decimal(self.received_quantity or ZERO), ZERO)

    def clean(self):
        super().clean()
        if self.purchase_order_id and self.tenant_id and self.purchase_order.tenant_id != self.tenant_id:
            raise ValidationError({"purchase_order": "Pedido e linha devem pertencer ao mesmo tenant."})
        if self.item_id and self.tenant_id and self.item.tenant_id != self.tenant_id:
            raise ValidationError({"item": "Item e linha devem pertencer ao mesmo tenant."})
        if self.received_quantity > self.ordered_quantity:
            raise ValidationError({"received_quantity": "Recebido não pode exceder o pedido."})

    def __str__(self) -> str:
        return f"{self.purchase_order.order_number} / {self.item.sku}"


class GoodsReceipt(CoreModel):
    prefix = "GRN"

    receipt_number = models.CharField(db_column="receipt_number", max_length=64)
    purchase_order = models.ForeignKey(
        "warehouse.PurchaseOrder",
        db_column="purchase_order_id",
        on_delete=models.PROTECT,
        related_name="receipts",
        null=True,
        blank=True,
    )
    warehouse = models.ForeignKey(
        "warehouse.Warehouse",
        db_column="warehouse_id",
        on_delete=models.PROTECT,
        related_name="receipts",
    )
    default_location = models.ForeignKey(
        "warehouse.StorageLocation",
        db_column="default_location_id",
        on_delete=models.PROTECT,
        related_name="default_receipts",
    )
    received_at = models.DateField(db_column="received_at", default=timezone.localdate)
    status = models.CharField(
        db_column="status",
        max_length=16,
        choices=DocumentStatus.choices,
        default=DocumentStatus.DRAFT,
    )
    posted_at = models.DateTimeField(db_column="posted_at", null=True, blank=True)
    notes = models.TextField(db_column="notes", blank=True, default="")

    class Meta:
        db_table = "warehouse_goods_receipt"
        verbose_name = "Recebimento de Compra"
        verbose_name_plural = "Recebimentos de Compra"
        ordering = ["-received_at", "-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "receipt_number"], name="warehouse_receipt_number_uniq"),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "warehouse"]),
        ]

    def clean(self):
        super().clean()
        if self.purchase_order_id and self.tenant_id and self.purchase_order.tenant_id != self.tenant_id:
            raise ValidationError({"purchase_order": "Pedido e recebimento devem pertencer ao mesmo tenant."})
        if self.warehouse_id and self.tenant_id and self.warehouse.tenant_id != self.tenant_id:
            raise ValidationError({"warehouse": "Armazém e recebimento devem pertencer ao mesmo tenant."})
        if self.default_location_id and self.tenant_id and self.default_location.tenant_id != self.tenant_id:
            raise ValidationError({"default_location": "Localização e recebimento devem pertencer ao mesmo tenant."})
        if (
            self.default_location_id
            and self.warehouse_id
            and self.default_location.warehouse_id != self.warehouse_id
        ):
            raise ValidationError({"default_location": "Localização deve pertencer ao armazém do recebimento."})

    def save(self, *args, **kwargs):
        if not self.name:
            self.name = f"Recebimento {self.receipt_number}"
        return super().save(*args, **kwargs)

    def post(self):
        if not self.pk:
            raise ValidationError("Guarde o recebimento antes de lançar.")

        with transaction.atomic():
            receipt = GoodsReceipt.all_objects.select_for_update().get(pk=self.pk)
            if receipt.status == DocumentStatus.POSTED:
                return receipt
            if receipt.status == DocumentStatus.CANCELLED:
                raise ValidationError("Recebimento cancelado não pode ser lançado.")

            lines = list(receipt.lines.select_related("item", "lot", "location", "purchase_order_line"))
            if not lines:
                raise ValidationError("Inclua pelo menos uma linha no recebimento.")

            for line in lines:
                lot = line.resolve_lot()
                StockMovement.objects.create(
                    tenant=receipt.tenant,
                    name=f"Recebimento {receipt.receipt_number} - {line.item.sku}",
                    item=line.item,
                    lot=lot,
                    destination_location=line.location or receipt.default_location,
                    movement_type=StockMovement.MovementType.RECEIPT,
                    quantity=line.quantity,
                    unit_cost=line.unit_cost,
                    reference_document=receipt.receipt_number,
                    reason="Recebimento de compra",
                    status=DocumentStatus.POSTED,
                )
                if line.purchase_order_line_id:
                    po_line = PurchaseOrderLine.all_objects.select_for_update().get(pk=line.purchase_order_line_id)
                    po_line.received_quantity = Decimal(po_line.received_quantity or ZERO) + Decimal(line.quantity)
                    if po_line.received_quantity > po_line.ordered_quantity:
                        raise ValidationError("Recebimento excede a quantidade pedida.")
                    po_line.save(update_fields=["received_quantity", "updated_at"])

            receipt.status = DocumentStatus.POSTED
            receipt.posted_at = timezone.now()
            receipt.save(update_fields=["status", "posted_at", "updated_at"])
            return receipt

    def __str__(self) -> str:
        return self.receipt_number


class GoodsReceiptLine(NoNameCoreModel):
    prefix = "GRL"

    receipt = models.ForeignKey(
        "warehouse.GoodsReceipt",
        db_column="receipt_id",
        on_delete=models.CASCADE,
        related_name="lines",
    )
    purchase_order_line = models.ForeignKey(
        "warehouse.PurchaseOrderLine",
        db_column="purchase_order_line_id",
        on_delete=models.PROTECT,
        related_name="receipt_lines",
        null=True,
        blank=True,
    )
    item = models.ForeignKey(
        "warehouse.WarehouseItem",
        db_column="item_id",
        on_delete=models.PROTECT,
        related_name="receipt_lines",
    )
    lot = models.ForeignKey(
        "warehouse.WarehouseLot",
        db_column="lot_id",
        on_delete=models.PROTECT,
        related_name="receipt_lines",
        null=True,
        blank=True,
    )
    lot_number = models.CharField(db_column="lot_number", max_length=80, blank=True, default="")
    expiration_date = models.DateField(db_column="expiration_date", null=True, blank=True)
    location = models.ForeignKey(
        "warehouse.StorageLocation",
        db_column="location_id",
        on_delete=models.PROTECT,
        related_name="receipt_lines",
        null=True,
        blank=True,
    )
    quantity = models.DecimalField(db_column="quantity", max_digits=14, decimal_places=4, validators=[MIN_QUANTITY])
    unit_cost = models.DecimalField(
        db_column="unit_cost",
        max_digits=14,
        decimal_places=4,
        default=ZERO,
        validators=[MIN_NON_NEGATIVE],
    )

    class Meta:
        db_table = "warehouse_goods_receipt_line"
        verbose_name = "Linha de Recebimento"
        verbose_name_plural = "Linhas de Recebimento"
        ordering = ["receipt", "id"]
        indexes = [
            models.Index(fields=["tenant", "receipt"]),
            models.Index(fields=["tenant", "item"]),
        ]

    def resolve_lot(self) -> WarehouseLot | None:
        if self.lot_id:
            return self.lot
        if not (self.lot_number or "").strip():
            return None
        lot, _created = WarehouseLot.objects.get_or_create(
            tenant=self.tenant,
            item=self.item,
            lot_number=self.lot_number.strip(),
            defaults={
                "expiration_date": self.expiration_date,
                "received_at": self.receipt.received_at,
                "unit_cost": self.unit_cost,
            },
        )
        return lot

    def clean(self):
        super().clean()
        if self.receipt_id and self.tenant_id and self.receipt.tenant_id != self.tenant_id:
            raise ValidationError({"receipt": "Recebimento e linha devem pertencer ao mesmo tenant."})
        if self.purchase_order_line_id and self.tenant_id and self.purchase_order_line.tenant_id != self.tenant_id:
            raise ValidationError({"purchase_order_line": "Linha do pedido deve pertencer ao mesmo tenant."})
        if self.item_id and self.tenant_id and self.item.tenant_id != self.tenant_id:
            raise ValidationError({"item": "Item e linha devem pertencer ao mesmo tenant."})
        if self.lot_id and self.item_id and self.lot.item_id != self.item_id:
            raise ValidationError({"lot": "Lote não pertence ao item selecionado."})
        if self.location_id and self.tenant_id and self.location.tenant_id != self.tenant_id:
            raise ValidationError({"location": "Localização e linha devem pertencer ao mesmo tenant."})

    def __str__(self) -> str:
        return f"{self.receipt.receipt_number} / {self.item.sku}"


class StockTransfer(CoreModel):
    prefix = "TRF"

    transfer_number = models.CharField(db_column="transfer_number", max_length=64)
    source_location = models.ForeignKey(
        "warehouse.StorageLocation",
        db_column="source_location_id",
        on_delete=models.PROTECT,
        related_name="source_transfers",
    )
    destination_location = models.ForeignKey(
        "warehouse.StorageLocation",
        db_column="destination_location_id",
        on_delete=models.PROTECT,
        related_name="destination_transfers",
    )
    status = models.CharField(
        db_column="status",
        max_length=16,
        choices=DocumentStatus.choices,
        default=DocumentStatus.DRAFT,
    )
    posted_at = models.DateTimeField(db_column="posted_at", null=True, blank=True)
    notes = models.TextField(db_column="notes", blank=True, default="")

    class Meta:
        db_table = "warehouse_stock_transfer"
        verbose_name = "Transferência de Estoque"
        verbose_name_plural = "Transferências de Estoque"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "transfer_number"], name="warehouse_transfer_number_uniq"),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "source_location"]),
            models.Index(fields=["tenant", "destination_location"]),
        ]

    def clean(self):
        super().clean()
        if self.source_location_id == self.destination_location_id:
            raise ValidationError("Origem e destino da transferência devem ser diferentes.")
        if self.source_location_id and self.tenant_id and self.source_location.tenant_id != self.tenant_id:
            raise ValidationError({"source_location": "Origem deve pertencer ao mesmo tenant."})
        if self.destination_location_id and self.tenant_id and self.destination_location.tenant_id != self.tenant_id:
            raise ValidationError({"destination_location": "Destino deve pertencer ao mesmo tenant."})

    def save(self, *args, **kwargs):
        if not self.name:
            self.name = f"Transferência {self.transfer_number}"
        return super().save(*args, **kwargs)

    def post(self):
        if not self.pk:
            raise ValidationError("Guarde a transferência antes de lançar.")

        with transaction.atomic():
            transfer = StockTransfer.all_objects.select_for_update().get(pk=self.pk)
            if transfer.status == DocumentStatus.POSTED:
                return transfer
            if transfer.status == DocumentStatus.CANCELLED:
                raise ValidationError("Transferência cancelada não pode ser lançada.")

            lines = list(transfer.lines.select_related("item", "lot"))
            if not lines:
                raise ValidationError("Inclua pelo menos uma linha na transferência.")

            for line in lines:
                StockMovement.objects.create(
                    tenant=transfer.tenant,
                    name=f"Transferência {transfer.transfer_number} - {line.item.sku}",
                    item=line.item,
                    lot=line.lot,
                    source_location=transfer.source_location,
                    destination_location=transfer.destination_location,
                    movement_type=StockMovement.MovementType.TRANSFER,
                    quantity=line.quantity,
                    reference_document=transfer.transfer_number,
                    reason="Transferência interna",
                    status=DocumentStatus.POSTED,
                )

            transfer.status = DocumentStatus.POSTED
            transfer.posted_at = timezone.now()
            transfer.save(update_fields=["status", "posted_at", "updated_at"])
            return transfer

    def __str__(self) -> str:
        return self.transfer_number


class StockTransferLine(NoNameCoreModel):
    prefix = "TRL"

    transfer = models.ForeignKey(
        "warehouse.StockTransfer",
        db_column="transfer_id",
        on_delete=models.CASCADE,
        related_name="lines",
    )
    item = models.ForeignKey(
        "warehouse.WarehouseItem",
        db_column="item_id",
        on_delete=models.PROTECT,
        related_name="transfer_lines",
    )
    lot = models.ForeignKey(
        "warehouse.WarehouseLot",
        db_column="lot_id",
        on_delete=models.PROTECT,
        related_name="transfer_lines",
        null=True,
        blank=True,
    )
    quantity = models.DecimalField(db_column="quantity", max_digits=14, decimal_places=4, validators=[MIN_QUANTITY])

    class Meta:
        db_table = "warehouse_stock_transfer_line"
        verbose_name = "Linha de Transferência"
        verbose_name_plural = "Linhas de Transferência"
        ordering = ["transfer", "id"]
        indexes = [
            models.Index(fields=["tenant", "transfer"]),
            models.Index(fields=["tenant", "item"]),
        ]

    def clean(self):
        super().clean()
        if self.transfer_id and self.tenant_id and self.transfer.tenant_id != self.tenant_id:
            raise ValidationError({"transfer": "Transferência e linha devem pertencer ao mesmo tenant."})
        if self.item_id and self.tenant_id and self.item.tenant_id != self.tenant_id:
            raise ValidationError({"item": "Item e linha devem pertencer ao mesmo tenant."})
        if self.lot_id and self.item_id and self.lot.item_id != self.item_id:
            raise ValidationError({"lot": "Lote não pertence ao item selecionado."})

    def __str__(self) -> str:
        return f"{self.transfer.transfer_number} / {self.item.sku}"


class CycleCount(CoreModel):
    prefix = "CNT"

    count_number = models.CharField(db_column="count_number", max_length=64)
    location = models.ForeignKey(
        "warehouse.StorageLocation",
        db_column="location_id",
        on_delete=models.PROTECT,
        related_name="cycle_counts",
    )
    status = models.CharField(
        db_column="status",
        max_length=16,
        choices=DocumentStatus.choices,
        default=DocumentStatus.DRAFT,
    )
    counted_at = models.DateField(db_column="counted_at", default=timezone.localdate)
    posted_at = models.DateTimeField(db_column="posted_at", null=True, blank=True)
    notes = models.TextField(db_column="notes", blank=True, default="")

    class Meta:
        db_table = "warehouse_cycle_count"
        verbose_name = "Inventário Cíclico"
        verbose_name_plural = "Inventários Cíclicos"
        ordering = ["-counted_at", "-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "count_number"], name="warehouse_cycle_count_number_uniq"),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "location"]),
        ]

    def clean(self):
        super().clean()
        if self.location_id and self.tenant_id and self.location.tenant_id != self.tenant_id:
            raise ValidationError({"location": "Localização e inventário devem pertencer ao mesmo tenant."})

    def save(self, *args, **kwargs):
        if not self.name:
            self.name = f"Inventário {self.count_number}"
        return super().save(*args, **kwargs)

    def post(self):
        if not self.pk:
            raise ValidationError("Guarde o inventário antes de lançar.")

        with transaction.atomic():
            count = CycleCount.all_objects.select_for_update().get(pk=self.pk)
            if count.status == DocumentStatus.POSTED:
                return count
            if count.status == DocumentStatus.CANCELLED:
                raise ValidationError("Inventário cancelado não pode ser lançado.")

            lines = list(count.lines.select_related("item", "lot"))
            if not lines:
                raise ValidationError("Inclua pelo menos uma linha no inventário.")

            for line in lines:
                current = StockLevel.current(tenant=count.tenant, item=line.item, lot=line.lot, location=count.location)
                line.system_quantity = current
                line.save(update_fields=["system_quantity", "updated_at"])
                difference = Decimal(line.counted_quantity or ZERO) - Decimal(current or ZERO)
                if difference == ZERO:
                    continue
                movement_type = (
                    StockMovement.MovementType.ADJUSTMENT_IN
                    if difference > ZERO
                    else StockMovement.MovementType.ADJUSTMENT_OUT
                )
                StockMovement.objects.create(
                    tenant=count.tenant,
                    name=f"Inventário {count.count_number} - {line.item.sku}",
                    item=line.item,
                    lot=line.lot,
                    source_location=count.location if difference < ZERO else None,
                    destination_location=count.location if difference > ZERO else None,
                    movement_type=movement_type,
                    quantity=abs(difference),
                    reference_document=count.count_number,
                    reason="Correção por inventário cíclico",
                    status=DocumentStatus.POSTED,
                )

            count.status = DocumentStatus.POSTED
            count.posted_at = timezone.now()
            count.save(update_fields=["status", "posted_at", "updated_at"])
            return count

    def __str__(self) -> str:
        return self.count_number


class CycleCountLine(NoNameCoreModel):
    prefix = "CNL"

    cycle_count = models.ForeignKey(
        "warehouse.CycleCount",
        db_column="cycle_count_id",
        on_delete=models.CASCADE,
        related_name="lines",
    )
    item = models.ForeignKey(
        "warehouse.WarehouseItem",
        db_column="item_id",
        on_delete=models.PROTECT,
        related_name="cycle_count_lines",
    )
    lot = models.ForeignKey(
        "warehouse.WarehouseLot",
        db_column="lot_id",
        on_delete=models.PROTECT,
        related_name="cycle_count_lines",
        null=True,
        blank=True,
    )
    system_quantity = models.DecimalField(
        db_column="system_quantity",
        max_digits=14,
        decimal_places=4,
        default=ZERO,
        validators=[MIN_NON_NEGATIVE],
    )
    counted_quantity = models.DecimalField(
        db_column="counted_quantity",
        max_digits=14,
        decimal_places=4,
        validators=[MIN_NON_NEGATIVE],
    )

    class Meta:
        db_table = "warehouse_cycle_count_line"
        verbose_name = "Linha de Inventário"
        verbose_name_plural = "Linhas de Inventário"
        ordering = ["cycle_count", "id"]
        indexes = [
            models.Index(fields=["tenant", "cycle_count"]),
            models.Index(fields=["tenant", "item"]),
        ]

    @property
    def variance(self) -> Decimal:
        return Decimal(self.counted_quantity or ZERO) - Decimal(self.system_quantity or ZERO)

    def clean(self):
        super().clean()
        if self.cycle_count_id and self.tenant_id and self.cycle_count.tenant_id != self.tenant_id:
            raise ValidationError({"cycle_count": "Inventário e linha devem pertencer ao mesmo tenant."})
        if self.item_id and self.tenant_id and self.item.tenant_id != self.tenant_id:
            raise ValidationError({"item": "Item e linha devem pertencer ao mesmo tenant."})
        if self.lot_id and self.item_id and self.lot.item_id != self.item_id:
            raise ValidationError({"lot": "Lote não pertence ao item selecionado."})

    def __str__(self) -> str:
        return f"{self.cycle_count.count_number} / {self.item.sku}"
