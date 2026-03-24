from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models, transaction
from django.db.models import DecimalField, F, Q, Sum
from django.db.models.functions import Coalesce

from core.models.base import CoreModel


class SaleItem(CoreModel):
    prefixo = "IVEND"

    venda = models.ForeignKey(
        "farmacia.Sale",
        on_delete=models.CASCADE,
        related_name="itens",
        db_index=True,
    )

    produto = models.ForeignKey(
        "farmacia.Product",
        on_delete=models.PROTECT,
        db_index=True,
    )

    quantidade = models.PositiveIntegerField(validators=[MinValueValidator(1)])

    preco_unitario = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
        blank=True,
    )

    class Meta:
        verbose_name = "Item da Venda"
        verbose_name_plural = "Itens da Venda"

        indexes = [
            models.Index(fields=["venda"]),
            models.Index(fields=["produto"]),
            models.Index(fields=["venda", "produto"]),
        ]

        constraints = [
            models.UniqueConstraint(
                fields=["venda", "produto"],
                condition=Q(deletado=False),
                name="unique_produto_por_venda",
            )
        ]

    # ==========================================
    # TOTAL CALCULADO
    # ==========================================

    @property
    def total_linha(self) -> Decimal:
        return (self.quantidade or 0) * (self.preco_unitario or Decimal("0.00"))

    # ==========================================
    # VALIDAÇÃO
    # ==========================================

    def clean(self):

        super().clean()

        if self.quantidade <= 0:
            raise ValidationError({"quantidade": "Quantidade deve ser maior que zero."})

        if self.preco_unitario is not None and self.preco_unitario < Decimal("0.00"):
            raise ValidationError({"preco_unitario": "Preço unitário inválido."})

        # impedir troca de produto após criação
        if self.pk:
            original = SaleItem.all_objects.get(pk=self.pk)
            if original.produto_id != self.produto_id:
                raise ValidationError({"produto": "Produto não pode ser alterado."})

    # ==========================================
    # ATUALIZA TOTAL DA VENDA
    # ==========================================

    def atualizar_total_venda(self):

        total = self.venda.itens.aggregate(
            total=Coalesce(
                Sum(
                    F("quantidade") * F("preco_unitario"),
                    output_field=DecimalField(max_digits=14, decimal_places=2),
                ),
                Decimal("0.00"),
            )
        )["total"]

        self.venda.total = total
        self.venda.save(update_fields=["total"])

    # ==========================================
    # BAIXA DE ESTOQUE (FEFO)
    # ==========================================

    def baixar_estoque(self):

        from apps.pharmacy.models.lot import Lot
        from apps.pharmacy.models.inventory_movement import (
            InventoryMovement,
            OrigemMovimento,
            TipoMovimento,
        )

        restante = self.quantidade

        for lote in Lot.disponiveis(self.produto):
            if restante <= 0:
                break

            saldo_lote = getattr(lote, "saldo", None)
            if callable(saldo_lote):
                saldo = saldo_lote()
            elif saldo_lote is None:
                saldo = lote.saldo()
            else:
                saldo = saldo_lote

            consumir = min(restante, saldo)
            if consumir <= 0:
                continue

            InventoryMovement.objects.create(
                nome=f"Saída {self.venda.numero or self.venda.id_custom} - {self.produto.nome}",
                lote=lote,
                tipo=TipoMovimento.SAIDA,
                origem=OrigemMovimento.VENDA,
                quantidade=consumir,
                item_venda=self,
                inquilino=self.inquilino,
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

        if criando and not self.preco_unitario:
            self.preco_unitario = self.produto.preco_venda
        if not self.nome:
            self.nome = f"Item {self.produto.nome}"

        super().save(*args, **kwargs)

        if criando:
            self.baixar_estoque()

        self.atualizar_total_venda()

    # ==========================================
    # DELETE
    # ==========================================

    def delete(self, *args, **kwargs):

        venda = self.venda

        super().delete(*args, **kwargs)

        total = venda.itens.aggregate(
            total=Coalesce(
                Sum(
                    F("quantidade") * F("preco_unitario"),
                    output_field=DecimalField(max_digits=14, decimal_places=2),
                ),
                Decimal("0.00"),
            )
        )["total"]

        venda.total = total
        venda.save(update_fields=["total"])

    def __str__(self):
        return f"{self.produto} x{self.quantidade}"
