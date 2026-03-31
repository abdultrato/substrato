"""Item de venda (linha) com baixa de estoque automática FEFO.

Comentários explicam cada linha em português para facilitar manutenção.
"""

from decimal import Decimal  # Operações monetárias precisas

from django.core.exceptions import ValidationError  # Exceções de validação
from django.core.validators import MinValueValidator  # Validador numérico mínimo
from django.db import models, transaction  # ORM e controle transacional
from django.db.models import DecimalField, F, Q, Sum  # Funções de agregação
from django.db.models.functions import Coalesce  # Troca None por zero

from core.models.base import CoreModel  # Modelo base
from apps.pharmacy.models.lot import Lot  # Import para acessar FEFO


class SaleItem(CoreModel):
    """Linha de item de uma venda, responsável por atualizar estoque."""

    prefix = "IVEND"  # Prefixo para IDs amigáveis

    sale = models.ForeignKey(
        "farmacia.Sale",  # Venda a que o item pertence
        verbose_name="Venda",  # Rótulo
        db_column="sale_id",  # Coluna
        on_delete=models.CASCADE,  # Remove item se a venda for apagada
        related_name="itens",  # Nome reverso
        db_index=True,  # Índice para consultas
    )

    product = models.ForeignKey(
        "farmacia.Product",  # Produto vendido
        verbose_name="Produto",  # Rótulo
        db_column="product_id",  # Coluna
        on_delete=models.PROTECT,  # Impede apagar produto vendido
        db_index=True,  # Índice
    )

    quantity = models.PositiveIntegerField(
        db_column="quantity",  # Coluna
        verbose_name="Quantidade",  # Rótulo
        validators=[MinValueValidator(1)],  # Garante valor mínimo 1
    )

    unit_price = models.DecimalField(
        db_column="unit_price",  # Coluna
        verbose_name="Preço unitário",  # Rótulo
        max_digits=14,  # Dígitos totais
        decimal_places=2,  # Casas decimais
        validators=[MinValueValidator(Decimal("0.00"))],  # Não permite negativo
        blank=True,  # Permitido deixar em branco (preenchido em save)
    )

    class Meta:
        db_table = "farmacia_itemvenda"  # Nome da tabela
        verbose_name = "Item de Venda"  # Nome legível
        verbose_name_plural = "Itens de Venda"  # Nome plural

        indexes = [
            models.Index(fields=["sale"]),
            models.Index(fields=["product"]),
            models.Index(fields=["sale", "product"]),
        ]

        constraints = [
            models.UniqueConstraint(
                fields=["sale", "product"],  # Produto não pode se repetir na mesma venda
                condition=Q(deleted=False),  # Ignora registros excluídos logicamente
                name="unique_product_por_sale",
            )
        ]

    # ==========================================
    # TOTAL CALCULADO
    # ==========================================

    @property
    def total_linha(self) -> Decimal:
        """Subtotal do item (quantidade x preço unitário)."""

        return (self.quantity or 0) * (self.unit_price or Decimal("0.00"))

    # ==========================================
    # VALIDAÇÃO
    # ==========================================

    def clean(self):

        super().clean()  # Executa validações padrão do modelo base

        if self.quantity <= 0:
            raise ValidationError({"quantity": "Quantidade deve ser maior que zero."})

        if self.unit_price is not None and self.unit_price < Decimal("0.00"):
            raise ValidationError({"unit_price": "Preço unitário inválido."})

        # impedir troca de product após criação
        if self.pk:
            original = SaleItem.all_objects.get(pk=self.pk)  # Busca versão persistida
            if original.product_id != self.product_id:
                raise ValidationError({"product": "Produto não pode ser alterado."})

    # ==========================================
    # ATUALIZA TOTAL DA VENDA
    # ==========================================

    def update_sale_total(self):

        total = self.sale.itens.aggregate(
            total=Coalesce(
                Sum(
                    F("quantity") * F("unit_price"),  # Multiplica cada item
                    output_field=DecimalField(max_digits=14, decimal_places=2),
                ),
                Decimal("0.00"),  # Substitui None por zero
            )
        )["total"]

        self.sale.total = total  # Atualiza o total da venda
        self.sale.save(update_fields=["total"])  # Salva apenas o campo total

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

        restante = self.quantity  # Quantidade que ainda falta dar baixa

        for lot in Lot.disponiveis(self.product):  # Percorre lotes FEFO
            if restante <= 0:
                break  # Sai se já baixou tudo

            saldo_lot = getattr(lot, "saldo", None)  # Prefere anotação de saldo
            if callable(saldo_lot):
                saldo = saldo_lot()  # Se for método, executa
            elif saldo_lot is None:
                saldo = lot.balance()  # Caso não exista anotação, calcula
            else:
                saldo = saldo_lot  # Usa valor anotado

            consumir = min(restante, saldo)  # Quantidade a consumir deste lote
            if consumir <= 0:
                continue  # Pula lotes sem saldo

            InventoryMovement.objects.create(
                name=f"Saída {self.sale.number or self.sale.custom_id} - {self.product.name}",
                lot=lot,
                type=MovementType.SAIDA,
                origin=MovementOrigin.VENDA,
                quantity=consumir,
                sale_item=self,
                tenant=self.tenant,
            )

            restante -= consumir  # Atualiza quantidade restante

        if restante > 0:
            raise ValidationError("Estoque insuficiente.")  # Não havia saldo

    def _clear_inventory_movements(self):
        from apps.pharmacy.models.inventory_movement import InventoryMovement

        InventoryMovement.objects.filter(sale_item=self).delete()  # Remove movimentos ligados

    # ==========================================
    # SAVE
    # ==========================================

    @transaction.atomic
    def save(self, *args, **kwargs):

        criando = self.pk is None  # Flag para saber se é criação

        # Sempre herda o preço do lote disponível (FEFO). Se não houver, cai para o produto.
        first_lot = Lot.disponiveis(self.product).first()  # Busca primeiro lote disponível
        if first_lot:
            self.unit_price = first_lot.sale_price  # Usa preço do lote
        else:
            self.unit_price = Lot.sale_price_for_product(self.product)  # Fallback para produto

        if not self.name:
            self.name = f"Item {self.product.name}"  # Nome default

        previous_qty = None  # Guarda quantidade anterior para detectar mudança
        if not criando:
            previous_qty = (
                self.__class__.all_objects.filter(pk=self.pk).values_list("quantity", flat=True).first()
            )

        super().save(*args, **kwargs)  # Salva/atualiza registro

        if criando:
            self.consume_inventory()  # Criação baixa estoque
        else:
            # Recalcula movimentos conforme nova quantidade.
            if previous_qty != self.quantity:
                self._clear_inventory_movements()  # Remove movimentos antigos
                self.consume_inventory()  # Rebaixa com nova quantidade

        self.update_sale_total()  # Mantém total da venda coerente

    # ==========================================
    # DELETE
    # ==========================================

    def delete(self, *args, **kwargs):

        sale = self.sale  # Guarda venda para recalcular depois
        # Remover movimentos de estoque para devolver saldo.
        self._clear_inventory_movements()

        super().delete(*args, **kwargs)  # Exclui item

        total = sale.itens.aggregate(
            total=Coalesce(
                Sum(
                    F("quantity") * F("unit_price"),
                    output_field=DecimalField(max_digits=14, decimal_places=2),
                ),
                Decimal("0.00"),
            )
        )["total"]

        sale.total = total  # Atualiza total restante
        sale.save(update_fields=["total"])  # Salva só o campo total

    def __str__(self):
        """Representação legível: produto e quantidade."""
        return f"{self.product} x{self.quantity}"


SaleItem.atualizar_total_sale = SaleItem.update_sale_total
SaleItem.baixar_estoque = SaleItem.consume_inventory
