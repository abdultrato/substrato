"""Modelo de lote de produto, com regras de validade e saldo FEFO.

Os comentários explicam cada linha para facilitar entendimento em português.
"""

from decimal import Decimal  # Operações monetárias com precisão

from django.core.exceptions import ValidationError  # Exceções de validação de domínio
from django.core.validators import MinValueValidator  # Validador mínimo
from django.db import models  # ORM do Django
from django.db.models import Case, Exists, F, IntegerField, OuterRef, Sum, When  # Funções para agregações
from django.db.models.functions import Coalesce  # Substitui None por zero
from django.utils import timezone  # Datas locais

from core.models.base import CoreModel  # Modelo base


class Lot(CoreModel):
    """Representa um lote físico de um produto."""

    class LotStatus(models.TextChoices):
        AVAILABLE = "AVAILABLE", "Disponível"
        QUARANTINE = "QUARANTINE", "Quarentena"
        DAMAGED = "DAMAGED", "Danificado"
        CONTAMINATED = "CONTAMINATED", "Contaminado"
        RECALLED = "RECALLED", "Recolhido"
        EXPIRED = "EXPIRED", "Vencido"
        DEPLETED = "DEPLETED", "Esgotado"

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

    status = models.CharField(
        db_column="status",
        verbose_name="Estado do lote",
        max_length=16,
        choices=LotStatus.choices,
        default=LotStatus.AVAILABLE,
        db_index=True,
        help_text="Estado operacional/qualitativo do lote.",
    )

    status_reason = models.CharField(
        db_column="status_reason",
        verbose_name="Motivo do estado",
        max_length=255,
        blank=True,
        default="",
        help_text="Justificação para quarentena, dano, contaminação, recolha ou outra alteração.",
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
            models.Index(fields=["status", "expiration_date"]),  # Estado operacional
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
    def is_expired(self):
        """Indica se o lote está vencido comparando com a data atual."""

        return self.expiration_date < timezone.localdate()

    @property
    def is_available_for_use(self):
        """Indica se o lote pode ser dispensado/consumido."""

        return self.status == self.LotStatus.AVAILABLE and not self.is_expired

    def mark_status(self, status, reason=""):
        """Atualiza o estado operacional/qualitativo do lote."""

        if status == self.LotStatus.AVAILABLE and self.is_expired:
            raise ValidationError("Lote vencido não pode ser liberado.")

        self.status = status
        self.status_reason = reason or ""
        self.save(update_fields=["status", "status_reason", "updated_at"])
        return self

    # =====================================================
    # SALDO
    # =====================================================

    def balance(self):
        """Calcula o saldo atual do lote (entradas - saídas), sem duplicar entrada inicial."""

        movimentos_qs = self.movimentos.filter(deleted=False)
        movimentos = movimentos_qs.aggregate(
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

        # Compatibilidade:
        # - Lotes novos têm um movimento inicial de entrada criado por signal.
        # - Lotes antigos podem não ter esse movimento.
        # Se já existe entrada inicial equivalente ao cadastro, o saldo é a própria
        # soma dos movimentos; caso contrário, soma com initial_quantity.
        has_initial_entry = movimentos_qs.filter(
            type="ENT",
            origin="AJUS",
            quantity=self.initial_quantity,
        ).exists()

        if has_initial_entry:
            return movimentos

        return self.initial_quantity + movimentos

    # =====================================================
    # QUERY FEFO
    # =====================================================

    @classmethod
    def available(cls, product):
        """Retorna queryset FEFO (primeiro que vence, primeiro a sair) com saldo."""

        from apps.pharmacy.models.inventory_movement import (
            InventoryMovement,
            MovementOrigin,
            MovementType,
        )

        hoje = timezone.localdate()  # Data de corte

        movimentos_total = Coalesce(
            Sum(
                Case(
                    When(
                        movimentos__type=MovementType.SAIDA,  # Saídas negativas
                        then=-F("movimentos__quantity"),
                    ),
                    default=F("movimentos__quantity"),  # Entradas positivas
                    output_field=IntegerField(),
                ),
                filter=models.Q(movimentos__deleted=False),
            ),
            0,
        )

        has_initial_entry = Exists(
            InventoryMovement.all_objects.filter(
                lot_id=OuterRef("pk"),
                deleted=False,
                type=MovementType.ENTRADA,
                origin=MovementOrigin.AJUSTE,
                quantity=OuterRef("initial_quantity"),
            )
        )

        return (
            cls.objects.filter(
                product=product,  # Apenas lotes do produto
                expiration_date__gte=hoje,  # Não vencidos
                status=cls.LotStatus.AVAILABLE,  # Apenas lotes liberados
            )
            .annotate(
                movimentos_total=movimentos_total,
                has_initial_entry=has_initial_entry,
            )
            .annotate(
                saldo=Case(
                    When(
                        has_initial_entry=True,
                        then=F("movimentos_total"),
                    ),
                    default=F("initial_quantity") + F("movimentos_total"),
                    output_field=IntegerField(),
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
        lot = cls.available(product).first()  # Primeiro lote disponível
        if lot and lot.sale_price is not None:
            return lot.sale_price  # Preço vindo do lote
        return getattr(product, "sale_price", Decimal("0.00"))  # Fallback para produto

    def __str__(self):
        """Representação legível com produto e número do lote."""

        return f"{self.product} - Lote {self.lot_number}"


Lot.current_stock = Lot.balance
