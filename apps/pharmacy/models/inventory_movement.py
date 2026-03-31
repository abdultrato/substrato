"""Movimentações de estoque da farmácia.

Cada campo e método possui comentários em português explicando seu funcionamento
para facilitar manutenção e repasses de conhecimento.
"""

from django.core.exceptions import ValidationError  # Exceções de validação
from django.core.validators import MinValueValidator  # Validador numérico mínimo
from django.db import models  # Ferramentas ORM
from django.db.models import Case, F, IntegerField, Sum, When  # Construções para agregações
from django.db.models.functions import Coalesce  # Função para lidar com nulos

from core.models.base import CoreModel  # Modelo base com campos comuns


class MovementType(models.TextChoices):
    """Enumera os tipos de movimento de estoque."""

    ENTRADA = "ENT", "Entrada"
    SAIDA = "SAI", "Saída"
    AJUSTE = "AJU", "Ajuste"


class MovementOrigin(models.TextChoices):
    """Origem que motivou a movimentação."""

    VENDA = "VEND", "Venda"
    PROCEDIMENTO = "PROC", "Procedimento"
    AJUSTE = "AJUS", "Ajuste"


class InventoryMovement(CoreModel):
    """Registro de entrada/saída de estoque associado a um lote."""

    prefix = "MVESQ"  # Prefixo para IDs amigáveis

    lot = models.ForeignKey(
        "farmacia.Lot",  # Tabela de lotes
        verbose_name="Lote",  # Rótulo
        db_column="lot_id",  # Nome da coluna
        on_delete=models.PROTECT,  # Impede apagar lote com movimento
        related_name="movimentos",  # Nome do relacionamento reverso
        db_index=True,  # Índice para performance
    )

    type = models.CharField(
        db_column="type",  # Coluna no banco
        verbose_name="Tipo",  # Rótulo
        max_length=3,  # Tamanho do código
        choices=MovementType.choices,  # Valores permitidos
        db_index=True,  # Índice para filtros
    )
    origin = models.CharField(
        db_column="origin",  # Coluna no banco
        verbose_name="Origem",  # Rótulo
        max_length=4,  # Tamanho do código
        choices=MovementOrigin.choices,  # Valores permitidos
        default=MovementOrigin.AJUSTE,  # Valor padrão
        db_index=True,  # Índice
    )

    sale_item = models.ForeignKey(
        "farmacia.SaleItem",  # Item de venda que gerou a saída
        verbose_name="Item de aquisição",  # Rótulo
        db_column="sale_item_id",  # Coluna
        on_delete=models.SET_NULL,  # Mantém movimento mesmo se item for removido
        null=True,  # Campo opcional
        blank=True,  # Permite omitir no formulário
        related_name="movimentos",  # Nome reverso
        db_index=True,  # Índice
    )

    quantity = models.PositiveIntegerField(
        db_column="quantity",  # Coluna
        verbose_name="Quantidade",  # Rótulo
        validators=[MinValueValidator(1)],  # Garante no mínimo 1 unidade
    )

    class Meta:
        db_table = "farmacia_movimentoestoque"  # Nome da tabela
        verbose_name = "Movimento de estoque"  # Nome legível
        verbose_name_plural = "Movimentos de estoque"  # Nome plural
        ordering = ["-created_at"]  # Ordenação padrão (mais recentes primeiro)

        indexes = [  # Índices auxiliares
            models.Index(fields=["lot", "created_at"]),
            models.Index(fields=["type"]),
            models.Index(fields=["origin"]),
        ]

    # =====================================
    # SALDO DO LOTE
    # =====================================

    def lot_balance(self):
        """Calcula o saldo atual do lote somando todas as movimentações."""

        total = self.lot.movimentos.aggregate(  # Agrega movimentos do lote
            total=Coalesce(  # Substitui None por zero
                Sum(  # Soma assinada das quantidades
                    Case(
                        When(
                            type=MovementType.SAIDA,  # Saídas são negativas
                            then=-F("quantity"),
                        ),
                        default=F("quantity"),  # Entradas contam positivo
                        output_field=IntegerField(),  # Força tipo inteiro
                    )
                ),
                0,
            )
        )["total"]

        return self.lot.initial_quantity + total  # Quantidade inicial + movimentos

    # =====================================
    # VALIDAÇÃO DE DOMÍNIO
    # =====================================

    def clean(self):
        """Validação de domínio executada antes de salvar."""

        super().clean()  # Executa validações do modelo base

        if not self.lot_id:  # Lote é obrigatório
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
            balance = self.lot_balance()  # Saldo disponível no lote

            if self.quantity > balance:  # Não permite saída maior que saldo
                raise ValidationError("Estoque insuficiente.")

    # =====================================
    # QUANTIDADE ASSINADA
    # =====================================

    @property
    def signed_quantity(self):
        """Retorna a quantidade com sinal (saída negativa, entrada positiva)."""

        if self.type == MovementType.SAIDA:
            return -self.quantity  # Saída vira valor negativo

        return self.quantity  # Entradas/ajustes retornam positivo

    # =====================================
    # SAVE
    # =====================================

    def save(self, *args, **kwargs):
        """Gera nome automático, valida e persiste o movimento."""

        if not self.name and self.lot_id:
            if self.origin == MovementOrigin.VENDA and self.sale_item_id:
                sale = self.sale_item.sale  # Venda associada
                reference = sale.number or sale.custom_id  # Referência amigável
                self.name = f"Venda {reference} - Lote {self.lot.lot_number}"
            elif self.origin == MovementOrigin.PROCEDIMENTO:
                self.name = f"Procedimento - Lote {self.lot.lot_number}"
            else:
                self.name = f"{self.get_type_display()} - Lote {self.lot.lot_number}"

        self.full_clean()  # Chama validações antes de salvar

        return super().save(*args, **kwargs)  # Persiste no banco

    def __str__(self):
        """Representação legível usada no admin e logs."""
        return f"{self.lot} - {self.type} ({self.quantity})"

