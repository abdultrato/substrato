"""Modelo de lote de produto, com regras de validade e saldo FEFO.

Os comentários explicam cada linha para facilitar entendimento em português.
"""

from django.core.exceptions import ValidationError  # Exceções de validação de domínio
from django.core.validators import MinValueValidator  # Validador mínimo
from django.db import models  # ORM do Django
from django.db.models import Case, F, IntegerField, Sum, When  # Funções para agregações
from django.db.models.functions import Coalesce  # Substitui None por zero
from django.utils import timezone  # Datas locais

from core.models.base import CoreModel  # Modelo base
from decimal import Decimal  # Operações monetárias com precisão


class Lot(CoreModel):
    """Representa um lote físico de um produto."""

    prefix = "LOTE"  # Prefixo usado para IDs amigáveis

    product = models.ForeignKey(
        "farmacia.Product",  # Produto ao qual o lote pertence
        verbose_name="Produto",  # Rótulo
        db_column="product_id",  # Coluna
        on_delete=models.PROTECT,  # Evita apagar produto com lotes
        related_name="lotes",  # Nome reverso
        db_index=True,  # Índice para buscas
    )

    lot_number = models.CharField(
        db_column="lot_number",  # Coluna
        verbose_name="Número do lote",  # Rótulo
        max_length=100,  # Tamanho máximo
        db_index=True,  # Índice
    )

    expiration_date = models.DateField(
        db_column="expiration_date",  # Coluna
        verbose_name="Validade",  # Rótulo
        db_index=True,  # Índice para consultas por data
    )

    initial_quantity = models.PositiveIntegerField(
        db_column="initial_quantity",  # Coluna
        verbose_name="Quantidade inicial",  # Rótulo
        validators=[MinValueValidator(1)],  # Garante quantidade mínima
        help_text="Quantidade inicial do lote.",  # Ajuda
    )

    sale_price = models.DecimalField(
        db_column="sale_price",  # Coluna
        verbose_name="Preço unitário",  # Rótulo
        max_digits=14,  # Dígitos totais
        decimal_places=2,  # Casas decimais
        default=Decimal("0.00"),  # Valor padrão
        validators=[MinValueValidator(Decimal("0.00"))],  # Não permite negativo
        help_text="Preço de venda para itens deste lote.",  # Ajuda
    )

    class Meta:
        db_table = "farmacia_lote"  # Nome da tabela
        verbose_name = "Lote"  # Nome legível
        verbose_name_plural = "Lotes"  # Nome plural
        ordering = ["expiration_date"]  # Ordenação padrão

        constraints = [
            models.UniqueConstraint(
                fields=["product", "lot_number"],  # Par único por produto
                condition=models.Q(deleted=False),  # Ignora registros excluídos logicamente
                name="unique_lot_product",
            )
        ]

        indexes = [
            models.Index(fields=["product", "expiration_date"]),  # Índice composto
            models.Index(fields=["expiration_date"]),  # Índice por validade
        ]

    # =====================================================
    # IMUTABILIDADE
    # =====================================================

    def save(self, *args, **kwargs):
        """Impõe regras de imutabilidade e sincroniza preço com o produto."""

        # Nome default
        if not self.name and self.lot_number and self.product_id:
            self.name = f"Lote {self.lot_number} - {self.product.name}"

        # Imutabilidade de campos críticos
        if self.pk:
            original = Lot.all_objects.get(pk=self.pk)  # Busca registro original

            if original.initial_quantity != self.initial_quantity:
                raise ValidationError("Quantidade inicial do lote é imutável.")

            if original.lot_number != self.lot_number:
                raise ValidationError("Número do lote não pode ser alterado.")

        # Sincroniza preço: se não informado, usa o do produto; se informado, propaga para o produto.
        if self.sale_price is None:
            self.sale_price = self.product.sale_price  # Herda preço do produto

        super().save(*args, **kwargs)  # Persiste alterações

        # Após salvar, mantém o preço do produto alinhado a este lote.
        if self.product and self.product.sale_price != self.sale_price:
            self.product.sale_price = self.sale_price
            self.product.save(update_fields=["sale_price"])

    # =====================================================
    # PROPRIEDADES
    # =====================================================

    @property
    def vencido(self):
        """Indica se o lote está vencido comparando com a data atual."""

        return self.expiration_date < timezone.localdate()

    # =====================================================
    # SALDO
    # =====================================================

    def balance(self):
        """Calcula o saldo atual do lote (entradas - saídas)."""

        movimentos = self.movimentos.aggregate(
            total=Coalesce(
                Sum(
                    Case(
                        When(
                            type="SAI",  # Saídas são negativas
                            then=-F("quantity"),
                        ),
                        default=F("quantity"),  # Entradas contam positivo
                        output_field=IntegerField(),
                    )
                ),
                0,
            )
        )["total"]

        return self.initial_quantity + movimentos  # Quantidade inicial + movimentos

    # =====================================================
    # QUERY FEFO
    # =====================================================

    @classmethod
    def disponiveis(cls, product):
        """Retorna queryset FEFO (primeiro que vence, primeiro a sair) com saldo."""

        hoje = timezone.localdate()  # Data de corte

        return (
            cls.objects.filter(
                product=product,  # Apenas lotes do produto
                expiration_date__gte=hoje,  # Não vencidos
            )
            .annotate(
                saldo=F("initial_quantity")
                + Coalesce(
                    Sum(
                        Case(
                            When(
                                movimentos__type="SAI",  # Saídas negativas
                                then=-F("movimentos__quantity"),
                            ),
                            default=F("movimentos__quantity"),  # Entradas positivas
                            output_field=IntegerField(),
                        )
                    ),
                    0,
                )
            )
            .filter(saldo__gt=0)  # Apenas lotes com saldo
            .order_by("expiration_date")  # FEFO
        )

    @classmethod
    def sale_price_for_product(cls, product):
        """
        Retorna o preço unitário com base no primeiro lote disponível (FEFO).
        Se nenhum lote tiver preço, usa o preço do produto.
        """
        lot = cls.disponiveis(product).first()  # Primeiro lote disponível
        if lot and lot.sale_price is not None:
            return lot.sale_price  # Preço vindo do lote
        return getattr(product, "sale_price", Decimal("0.00"))  # Fallback para produto

    def __str__(self):
        """Representação legível com produto e número do lote."""

        return f"{self.product} - Lote {self.lot_number}"


Lot.saldo = Lot.balance
