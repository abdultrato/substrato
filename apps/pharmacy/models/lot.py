from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Case, F, IntegerField, Sum, When
from django.db.models.functions import Coalesce
from django.utils import timezone

from core.models.base import CoreModel
from decimal import Decimal


class Lot(CoreModel):
    prefix = "LOTE"

    product = models.ForeignKey(
        "farmacia.Product",
        verbose_name="Produto",
        db_column="product_id",
        on_delete=models.PROTECT,
        related_name="lotes",
        db_index=True,
    )

    lot_number = models.CharField(
        db_column="lot_number",
        verbose_name="Número do lote",
        max_length=100,
        db_index=True,
    )

    expiration_date = models.DateField(
        db_column="expiration_date",
        verbose_name="Validade",
        db_index=True,
    )

    initial_quantity = models.PositiveIntegerField(
        db_column="initial_quantity",
        verbose_name="Quantidade inicial",
        validators=[MinValueValidator(1)],
        help_text="Quantidade inicial do lot.",
    )

    sale_price = models.DecimalField(
        db_column="sale_price",
        verbose_name="Preço unitário",
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Preço de venda para itens deste lote.",
    )

    class Meta:
        db_table = "farmacia_lote"
        verbose_name = "Lote"
        verbose_name_plural = "Lotes"
        ordering = ["expiration_date"]

        constraints = [
            models.UniqueConstraint(
                fields=["product", "lot_number"],
                condition=models.Q(deleted=False),
                name="unique_lot_product",
            )
        ]

        indexes = [
            models.Index(fields=["product", "expiration_date"]),
            models.Index(fields=["expiration_date"]),
        ]

    # =====================================================
    # IMUTABILIDADE
    # =====================================================

    def save(self, *args, **kwargs):
        # Nome default
        if not self.name and self.lot_number and self.product_id:
            self.name = f"Lote {self.lot_number} - {self.product.name}"

        # Imutabilidade de campos críticos
        if self.pk:
            original = Lot.all_objects.get(pk=self.pk)

            if original.initial_quantity != self.initial_quantity:
                raise ValidationError("Quantidade inicial do lot é imutável.")

            if original.lot_number != self.lot_number:
                raise ValidationError("Número do lot não pode ser alterado.")

        # Sincroniza preço: se não informado, usa o do produto; se informado, propaga para o produto.
        if self.sale_price is None:
            self.sale_price = self.product.sale_price

        super().save(*args, **kwargs)

        # Após salvar, mantém o preço do produto alinhado a este lote.
        if self.product and self.product.sale_price != self.sale_price:
            self.product.sale_price = self.sale_price
            self.product.save(update_fields=["sale_price"])

    # =====================================================
    # PROPRIEDADES
    # =====================================================

    @property
    def vencido(self):

        return self.expiration_date < timezone.localdate()

    # =====================================================
    # SALDO
    # =====================================================

    def balance(self):

        movimentos = self.movimentos.aggregate(
            total=Coalesce(
                Sum(
                    Case(
                        When(
                            type="SAI",
                            then=-F("quantity"),
                        ),
                        default=F("quantity"),
                        output_field=IntegerField(),
                    )
                ),
                0,
            )
        )["total"]

        return self.initial_quantity + movimentos

    # =====================================================
    # QUERY FEFO
    # =====================================================

    @classmethod
    def disponiveis(cls, product):

        hoje = timezone.localdate()

        return (
            cls.objects.filter(
                product=product,
                expiration_date__gte=hoje,
            )
            .annotate(
                saldo=F("initial_quantity")
                + Coalesce(
                    Sum(
                        Case(
                            When(
                                movimentos__type="SAI",
                                then=-F("movimentos__quantity"),
                            ),
                            default=F("movimentos__quantity"),
                            output_field=IntegerField(),
                        )
                    ),
                    0,
                )
            )
            .filter(saldo__gt=0)
            .order_by("expiration_date")
        )

    @classmethod
    def sale_price_for_product(cls, product):
        """
        Returns the unit sale price based on the first available lot (FEFO).
        Falls back to the product sale price if no lot has a price.
        """
        lot = cls.disponiveis(product).first()
        if lot and lot.sale_price is not None:
            return lot.sale_price
        return getattr(product, "sale_price", Decimal("0.00"))

    def __str__(self):

        return f"{self.product} - Lote {self.lot_number}"


Lot.saldo = Lot.balance
