from decimal import Decimal

from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.core.validators import MinValueValidator
from django.db import models, transaction

from apps.pharmacy.models.inventory_movement import (
    InventoryMovement,
    MovementOrigin,
    MovementType,
)
from apps.pharmacy.models.lot import Lot
from core.mixins.model.position import ScopedPositionMixin
from core.models.base import NoNameCoreModel


class ProcedureMaterial(ScopedPositionMixin, NoNameCoreModel):
    """Material consumido/associado a um procedimento de enfermagem."""
    prefix = "PROCMAT"

    procedure = models.ForeignKey(

        "enfermagem.Procedure",

        db_column="procedure_id",
        on_delete=models.CASCADE,
        related_name="materiais",
        db_index=True,
    )
    procedure_item = models.ForeignKey(
        "enfermagem.ProcedureItem",
        db_column="procedure_item_id",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="materiais_gerados",
        db_index=True,
    )
    product = models.ForeignKey(
        "farmacia.Product",
        db_column="product_id",
        on_delete=models.PROTECT,
        related_name="consumos_procedure",
        db_index=True,
    )
    lot = models.ForeignKey(
        "farmacia.Lot",
        db_column="lot_id",
        on_delete=models.PROTECT,
        related_name="consumos_procedure",
        db_index=True,
        null=True,
        blank=True,
    )
    quantity = models.PositiveIntegerField(
        db_column="quantity",
        validators=[MinValueValidator(1)],
    )
    unit_cost = models.DecimalField(
        db_column="unit_cost",
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    inventory_movement = models.OneToOneField(
        "farmacia.InventoryMovement",
        db_column="inventory_movement_id",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="consumo_procedure",
    )
    observation = models.TextField(
        db_column="observation",
        blank=True, default="")

    class Meta:
        db_table = "enfermagem_procedimentomaterial"
        ordering = ["procedure", "position", "id"]
        verbose_name = "Material do Procedimento"
        verbose_name_plural = "Materiais do Procedimento"
        indexes = [
            models.Index(fields=["tenant", "procedure"]),
            models.Index(fields=["procedure_item"]),
            models.Index(fields=["product"]),
            models.Index(fields=["lot"]),
        ]

    position_scope_fields = ("procedure",)

    @property
    def total_linha(self):
        try:
            custo = self.value.unit_cost
        except ObjectDoesNotExist:
            custo = self.unit_cost or Decimal("0.00")

        return (self.quantity or 0) * (custo or Decimal("0.00"))

    def clean(self):
        super().clean()

        if self.lot_id and self.product_id and self.lot.product_id != self.product_id:
            raise ValidationError({"lot": "O lot selecionado não pertence ao product informado."})

        if (
            self.procedure_id
            and self.procedure_item_id
            and self.procedure_item.procedure_id != self.procedure_id
        ):
            raise ValidationError({"procedure_item": "Item não pertence ao procedure informado."})

        if self.procedure_id and self.product_id and self.procedure.tenant_id != self.product.tenant_id:
            raise ValidationError({"product": "Produto e procedure devem pertencer ao mesmo tenant."})

        if self.procedure_id and self.lot_id and self.procedure.tenant_id != self.lot.tenant_id:
            raise ValidationError({"lot": "Lote e procedure devem pertencer ao mesmo tenant."})

        # Permitimos manter históricos de consumo mesmo após a expiration_date ter passado,
        # mas não permitimos "baixar" estoque de lot já vencido.
        if self.lot_id and self.lot.vencido and not self.inventory_movement_id:
            raise ValidationError({"lot": "Não é permitido consumir lot vencido."})

        if self.pk:
            original = self.__class__.all_objects.get(pk=self.pk)
            # Depois que o material for lançado no estoque, campos críticos ficam imutáveis
            # EXCETO quantity, que pode ser modificada com estorno automático
            if original.inventory_movement_id:
                campos_immutaveis = (
                    "procedure_id",
                    "product_id",
                    "lot_id",
                    "procedure_item_id",
                )
                if any(getattr(original, campo) != getattr(self, campo) for campo in campos_immutaveis):
                    raise ValidationError(
                        "Material já lançado no estoque é imutável. Faça estorno e inclua um novo lançamento."
                    )
            else:
                # Enquanto estiver pendente (sem inventory_movement), permitimos
                # escolher lot e lançar o movimento posteriormente, mas
                # mantemos a referência imutáveis.
                campos_immutaveis = (
                    "procedure_id",
                    "product_id",
                    "procedure_item_id",
                )
                if any(getattr(original, campo) != getattr(self, campo) for campo in campos_immutaveis):
                    raise ValidationError("Material pendente é imutável (pode alterar lot/quantidade).")

    def _resolver_unit_cost(self):
        if self.unit_cost and self.unit_cost > 0:
            return self.unit_cost

        # Prefer price from the selected lot; fallback to product price; else zero.
        if self.lot_id and self.lot.sale_price is not None:
            return self.lot.sale_price

        if self.product_id and self.product.sale_price:
            return self.product.sale_price

        return Decimal("0.00")

    def _select_automatic_lot(self):
        if self.lot_id or not self.product_id:
            return

        quantity = self.quantity or 0

        lotes_disponiveis = Lot.disponiveis(self.product)
        if self.tenant_id:
            lotes_disponiveis = lotes_disponiveis.filter(tenant_id=self.tenant_id)

        lot = lotes_disponiveis.filter(saldo__gte=quantity).first()
        if lot is None:
            raise ValidationError({"product": ("Sem lot válido com saldo suficiente para este material.")})

        self.lot = lot

    def _upsert_value(self):
        from apps.nursing.models.procedure_material_value import (
            ProcedureMaterialValue,
        )

        custo = self._resolver_unit_cost()

        value, created = ProcedureMaterialValue.all_objects.get_or_create(
            material=self,
            defaults={
                "tenant_id": self.tenant_id,
                "unit_cost": custo,
            },
        )

        if not created and (value.tenant_id != self.tenant_id or value.unit_cost != custo):
            value.tenant_id = self.tenant_id
            value.unit_cost = custo
            value.save(update_fields=["tenant", "unit_cost", "updated_at"])

        if self.unit_cost != custo:
            self.__class__.all_objects.filter(pk=self.pk).update(unit_cost=custo)
            self.unit_cost = custo

    @transaction.atomic
    def save(self, *args, **kwargs):
        alocar_estoque = bool(kwargs.pop("alocar_estoque", True))
        quantity_changed = False
        original_quantity = None

        if not self.tenant_id and self.procedure_id:
            self.tenant_id = self.procedure.tenant_id

        # Detecta mudança de quantidade em material já lançado no estoque
        if self.pk:
            original = self.__class__.all_objects.get(pk=self.pk)
            if original.inventory_movement_id and original.quantity != self.quantity:
                quantity_changed = True
                original_quantity = original.quantity

        if alocar_estoque:
            self._select_automatic_lot()
        self.full_clean()
        super().save(*args, **kwargs)

        # Se quantidade foi alterada após lançamento, faz estorno + novo movimento
        if quantity_changed and original_quantity is not None:
            # Cria movimento de entrada (estorno) da quantidade anterior
            InventoryMovement.objects.create(
                name=(f"Estorno/Ajuste {self.procedure.custom_id or self.procedure_id} - {self.product.name}"),
                lot=self.lot,
                type=MovementType.ENTRADA,
                origin=MovementOrigin.PROCEDIMENTO,
                quantity=original_quantity,
                tenant=self.tenant,
            )
            # Cria novo movimento de saída com a quantidade nova
            bunch = InventoryMovement.objects.create(
                name=(f"Consumo (Ajuste) {self.procedure.custom_id or self.procedure_id} - {self.product.name}"),
                lot=self.lot,
                type=MovementType.SAIDA,
                origin=MovementOrigin.PROCEDIMENTO,
                quantity=self.quantity,
                tenant=self.tenant,
            )
            self.inventory_movement = bunch
            self.__class__.all_objects.filter(pk=self.pk).update(inventory_movement=bunch)

        elif alocar_estoque and self.inventory_movement_id is None:
            if not self.lot_id:
                raise ValidationError({"lot": "Lote é obrigatório para baixar estoque do material."})

            lot = Lot.objects.select_for_update().get(pk=self.lot_id)
            if self.quantity > lot.saldo():
                raise ValidationError({"quantity": "Estoque insuficiente no lot selecionado."})

            movimento = InventoryMovement.objects.create(
                name=(f"Consumo {self.procedure.custom_id or self.procedure_id} - {self.product.name}"),
                lot=lot,
                type=MovementType.SAIDA,
                origin=MovementOrigin.PROCEDIMENTO,
                quantity=self.quantity,
                tenant=self.tenant,
            )
            self.inventory_movement = movimento
            super().save(update_fields=["inventory_movement"])

        self._upsert_value()
        self.procedure.recalculate_totals()

    @transaction.atomic
    def delete(self, *args, **kwargs):
        if self.deleted:
            return

        procedure = self.procedure

        if self.inventory_movement_id:
            InventoryMovement.objects.create(
                name=(f"Estorno {self.procedure.custom_id or self.procedure_id} - {self.product.name}"),
                lot=self.lot,
                type=MovementType.ENTRADA,
                origin=MovementOrigin.PROCEDIMENTO,
                quantity=self.quantity,
                tenant=self.tenant,
            )

        try:
            value = self.value
        except ObjectDoesNotExist:
            value = None

        if value and not value.deleted:
            value.delete()

        super().delete(*args, **kwargs)
        procedure.recalculate_totals()

    def __str__(self):
        return f"{self.product.name} x{self.quantity}"


ProcedureMaterial._selecionar_lot_automatico = ProcedureMaterial._select_automatic_lot
ProcedureMaterial._upsert_value = ProcedureMaterial._upsert_value
