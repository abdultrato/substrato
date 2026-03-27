from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Case, F, IntegerField, Sum, When
from django.db.models.functions import Coalesce

from core.models.base import CoreModel


class MovementType(models.TextChoices):
    ENTRADA = "ENT", "Entrada"
    SAIDA = "SAI", "Saída"
    AJUSTE = "AJU", "Ajuste"


class MovementOrigin(models.TextChoices):
    VENDA = "VEND", "Venda"
    PROCEDIMENTO = "PROC", "Procedimento"
    AJUSTE = "AJUS", "Ajuste"




class InventoryMovement(CoreModel):
    prefix = "MVESQ"

    lot = models.ForeignKey(
        "farmacia.Lot",
        verbose_name="Lote",
        db_column="lot_id",
        on_delete=models.PROTECT,
        related_name="movimentos",
        db_index=True,
    )

    type = models.CharField(
        db_column="type",
        verbose_name="Tipo",
        max_length=3,
        choices=MovementType.choices,
        db_index=True,
    )
    origin = models.CharField(
        db_column="origin",
        verbose_name="Origem",
        max_length=4,
        choices=MovementOrigin.choices,
        default=MovementOrigin.AJUSTE,
        db_index=True,
    )

    sale_item = models.ForeignKey(
        "farmacia.SaleItem",
        verbose_name="Item de aquisição",
        db_column="sale_item_id",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="movimentos",
        db_index=True,
    )

    quantity = models.PositiveIntegerField(
        db_column="quantity",
        verbose_name="Quantidade",
        validators=[MinValueValidator(1)])

    class Meta:
        db_table = "farmacia_movimentoestoque"
        verbose_name = "Movimento de estoque"
        verbose_name_plural = "Movimentos de estoque"
        ordering = ["-created_at"]

        indexes = [
            models.Index(fields=["lot", "created_at"]),
            models.Index(fields=["type"]),
            models.Index(fields=["origin"]),
        ]

    # =====================================
    # SALDO DO LOTE
    # =====================================

    def lot_balance(self):

        total = self.lot.movimentos.aggregate(
            total=Coalesce(
                Sum(
                    Case(
                        When(
                            type=MovementType.SAIDA,
                            then=-F("quantity"),
                        ),
                        default=F("quantity"),
                        output_field=IntegerField(),
                    )
                ),
                0,
            )
        )["total"]

        return self.lot.initial_quantity + total

    # =====================================
    # VALIDAÇÃO DE DOMÍNIO
    # =====================================

    def clean(self):

        super().clean()

        if not self.lot_id:
            raise ValidationError("Lote é obrigatório.")

        # Só bloqueia saídas para lotes vencidos; entradas/ajustes podem registrar histórico.
        if self.type == MovementType.SAIDA and self.lot.vencido:
            raise ValidationError("Não é permitido movimentar lot vencido.")

        # valida tenant
        if self.tenant_id and self.lot.tenant_id != self.tenant_id:
            raise ValidationError("Inquilino do movimento difere do lot.")

        if self.sale_item_id and self.tenant_id and self.sale_item.tenant_id != self.tenant_id:
            raise ValidationError("Inquilino do movimento difere do item de sale.")

        # coerência origin / type / vínculo de sale
        if self.origin == MovementOrigin.VENDA and self.type != MovementType.SAIDA:
            raise ValidationError("Movimento com origin em sale deve ser de saída.")

        if self.type == MovementType.SAIDA and self.origin == MovementOrigin.VENDA and not self.sale_item:
            raise ValidationError("Movimentos de saída devem estar ligados a um ItemVenda.")

        if self.type == MovementType.SAIDA and self.origin != MovementOrigin.VENDA and self.sale_item:
            raise ValidationError("Saídas que não são de sale não devem estar ligadas a ItemVenda.")

        if self.type == MovementType.ENTRADA and self.sale_item:
            raise ValidationError("Entradas de estoque não devem estar ligadas a vendas.")

        # valida saldo
        if self.type == MovementType.SAIDA:
            balance = self.lot_balance()

            if self.quantity > balance:
                raise ValidationError("Estoque insuficiente.")

    # =====================================
    # QUANTIDADE ASSINADA
    # =====================================

    @property
    def signed_quantity(self):

        if self.type == MovementType.SAIDA:
            return -self.quantity

        return self.quantity

    # =====================================
    # SAVE
    # =====================================

    def save(self, *args, **kwargs):
        if not self.name and self.lot_id:
            if self.origin == MovementOrigin.VENDA and self.sale_item_id:
                sale = self.sale_item.sale
                reference = sale.number or sale.custom_id
                self.name = f"Venda {reference} - Lote {self.lot.lot_number}"
            elif self.origin == MovementOrigin.PROCEDIMENTO:
                self.name = f"Procedimento - Lote {self.lot.lot_number}"
            else:
                self.name = f"{self.get_type_display()} - Lote {self.lot.lot_number}"

        self.full_clean()

        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.lot} - {self.type} ({self.quantity})"

