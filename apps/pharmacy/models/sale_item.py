from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models, transaction
from django.db.models import DecimalField, F, Q, Sum
from django.db.models.functions import Coalesce

from core.models.base import CoreModel


class SaleItem(CoreModel):
    prefix = "IVEND"

    sale = models.ForeignKey(
        "farmacia.Sale",
        verbose_name="Venda",
        db_column="sale_id",
        on_delete=models.CASCADE,
        related_name="itens",
        db_index=True,
    )

    product = models.ForeignKey(
        "farmacia.Product",
        verbose_name="Produto",
        db_column="product_id",
        on_delete=models.PROTECT,
        db_index=True,
    )

    quantity = models.PositiveIntegerField(
        db_column="quantity",
        verbose_name="Quantidade",
        validators=[MinValueValidator(1)])

    unit_price = models.DecimalField(
        db_column="unit_price",
        verbose_name="Preço unitário",
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
        blank=True,
    )

    class Meta:
        db_table = "farmacia_itemvenda"
        verbose_name = "Item da Venda"
        verbose_name_plural = "Itens da Venda"

        indexes = [
            models.Index(fields=["sale"]),
            models.Index(fields=["product"]),
            models.Index(fields=["sale", "product"]),
        ]

        constraints = [
            models.UniqueConstraint(
                fields=["sale", "product"],
                condition=Q(deleted=False),
                name="unique_product_por_sale",
            )
        ]

    # ==========================================
    # TOTAL CALCULADO
    # ==========================================

    @property
    def total_linha(self) -> Decimal:
        return (self.quantity or 0) * (self.unit_price or Decimal("0.00"))

    # ==========================================
    # VALIDAÇÃO
    # ==========================================

    def clean(self):

        super().clean()

        if self.quantity <= 0:
            raise ValidationError({"quantity": "Quantidade deve ser maior que zero."})

        if self.unit_price is not None and self.unit_price < Decimal("0.00"):
            raise ValidationError({"unit_price": "Preço unitário inválido."})

        # impedir troca de product após criação
        if self.pk:
            original = SaleItem.all_objects.get(pk=self.pk)
            if original.product_id != self.product_id:
                raise ValidationError({"product": "Produto não pode ser alterado."})

    # ==========================================
    # ATUALIZA TOTAL DA VENDA
    # ==========================================

    def update_sale_total(self):

        total = self.sale.itens.aggregate(
            total=Coalesce(
                Sum(
                    F("quantity") * F("unit_price"),
                    output_field=DecimalField(max_digits=14, decimal_places=2),
                ),
                Decimal("0.00"),
            )
        )["total"]

        self.sale.total = total
        self.sale.save(update_fields=["total"])

    # ==========================================
    # BAIXA DE ESTOQUE (FEFO)
    # ==========================================

    def consume_inventory(self):

        from apps.pharmacy.models.inventory_movement import (
            InventoryMovement,
            MovementOrigin,
            MovementType,
        )
        from apps.pharmacy.models.lot import Lot

        restante = self.quantity

        for lot in Lot.disponiveis(self.product):
            if restante <= 0:
                break

            saldo_lot = getattr(lot, "saldo", None)
            if callable(saldo_lot):
                saldo = saldo_lot()
            elif saldo_lot is None:
                saldo = lot.balance()
            else:
                saldo = saldo_lot

            consumir = min(restante, saldo)
            if consumir <= 0:
                continue

            InventoryMovement.objects.create(
                name=f"Saída {self.sale.number or self.sale.custom_id} - {self.product.name}",
                lot=lot,
                type=MovementType.SAIDA,
                origin=MovementOrigin.VENDA,
                quantity=consumir,
                sale_item=self,
                tenant=self.tenant,
            )

            restante -= consumir

        if restante > 0:
            raise ValidationError("Estoque insuficiente.")

    # ==========================================
    # SAVE
    # ==========================================

    @transaction.atomic
    def save(self, *args, **kwargs):

        criando = self.pk is None

        if criando and not self.unit_price:
            self.unit_price = self.product.sale_price
        if not self.name:
            self.name = f"Item {self.product.name}"

        super().save(*args, **kwargs)

        if criando:
            self.consume_inventory()

        self.update_sale_total()

    # ==========================================
    # DELETE
    # ==========================================

    def delete(self, *args, **kwargs):

        sale = self.sale

        super().delete(*args, **kwargs)

        total = sale.itens.aggregate(
            total=Coalesce(
                Sum(
                    F("quantity") * F("unit_price"),
                    output_field=DecimalField(max_digits=14, decimal_places=2),
                ),
                Decimal("0.00"),
            )
        )["total"]

        sale.total = total
        sale.save(update_fields=["total"])

    def __str__(self):
        return f"{self.product} x{self.quantity}"


SaleItem.atualizar_total_sale = SaleItem.update_sale_total
SaleItem.baixar_estoque = SaleItem.consume_inventory
