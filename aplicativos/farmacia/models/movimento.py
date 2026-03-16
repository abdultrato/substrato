from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Case, F, IntegerField, Sum, When
from django.db.models.functions import Coalesce

from nucleo.modelos.base import CoreModel


class TipoMovimento(models.TextChoices):
    ENTRADA = "ENT", "Entrada"
    SAIDA = "SAI", "Saída"
    AJUSTE = "AJU", "Ajuste"


class OrigemMovimento(models.TextChoices):
    VENDA = "VEND", "Venda"
    PROCEDIMENTO = "PROC", "Procedimento"
    AJUSTE = "AJUS", "Ajuste"


class MovimentoEstoque(CoreModel):
    prefixo = "MVESQ"

    lote = models.ForeignKey(
        "farmacia.Lote",
        on_delete=models.PROTECT,
        related_name="movimentos",
        db_index=True,
    )

    tipo = models.CharField(
        max_length=3,
        choices=TipoMovimento.choices,
        db_index=True,
    )
    origem = models.CharField(
        max_length=4,
        choices=OrigemMovimento.choices,
        default=OrigemMovimento.AJUSTE,
        db_index=True,
    )

    item_venda = models.ForeignKey(
        "farmacia.ItemVenda",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="movimentos",
        db_index=True,
    )

    quantidade = models.PositiveIntegerField(validators=[MinValueValidator(1)])

    class Meta:
        ordering = ["-criado_em"]

        indexes = [
            models.Index(fields=["lote", "criado_em"]),
            models.Index(fields=["tipo"]),
            models.Index(fields=["origem"]),
        ]

    # =====================================
    # SALDO DO LOTE
    # =====================================

    def saldo_lote(self):

        total = self.lote.movimentos.aggregate(
            total=Coalesce(
                Sum(
                    Case(
                        When(
                            tipo=TipoMovimento.SAIDA,
                            then=-F("quantidade"),
                        ),
                        default=F("quantidade"),
                        output_field=IntegerField(),
                    )
                ),
                0,
            )
        )["total"]

        return self.lote.quantidade_inicial + total

    # =====================================
    # VALIDAÇÃO DE DOMÍNIO
    # =====================================

    def clean(self):

        super().clean()

        if not self.lote_id:
            raise ValidationError("Lote é obrigatório.")

        if self.lote.vencido:
            raise ValidationError("Não é permitido movimentar lote vencido.")

        # valida tenant
        if self.inquilino_id and self.lote.inquilino_id != self.inquilino_id:
            raise ValidationError("Inquilino do movimento difere do lote.")

        if self.item_venda_id and self.inquilino_id and self.item_venda.inquilino_id != self.inquilino_id:
            raise ValidationError("Inquilino do movimento difere do item de venda.")

        # coerência origem / tipo / vínculo de venda
        if self.origem == OrigemMovimento.VENDA and self.tipo != TipoMovimento.SAIDA:
            raise ValidationError("Movimento com origem em venda deve ser de saída.")

        if self.tipo == TipoMovimento.SAIDA and self.origem == OrigemMovimento.VENDA and not self.item_venda:
            raise ValidationError("Movimentos de saída devem estar ligados a um ItemVenda.")

        if self.tipo == TipoMovimento.SAIDA and self.origem != OrigemMovimento.VENDA and self.item_venda:
            raise ValidationError("Saídas que não são de venda não devem estar ligadas a ItemVenda.")

        if self.tipo == TipoMovimento.ENTRADA and self.item_venda:
            raise ValidationError("Entradas de estoque não devem estar ligadas a vendas.")

        # valida saldo
        if self.tipo == TipoMovimento.SAIDA:
            saldo = self.saldo_lote()

            if self.quantidade > saldo:
                raise ValidationError("Estoque insuficiente.")

    # =====================================
    # QUANTIDADE ASSINADA
    # =====================================

    @property
    def quantidade_assinada(self):

        if self.tipo == TipoMovimento.SAIDA:
            return -self.quantidade

        return self.quantidade

    # =====================================
    # SAVE
    # =====================================

    def save(self, *args, **kwargs):
        if not self.nome and self.lote_id:
            if self.origem == OrigemMovimento.VENDA and self.item_venda_id:
                venda = self.item_venda.venda
                referencia = venda.numero or venda.id_custom
                self.nome = f"Venda {referencia} - Lote {self.lote.numero_lote}"
            elif self.origem == OrigemMovimento.PROCEDIMENTO:
                self.nome = f"Procedimento - Lote {self.lote.numero_lote}"
            else:
                self.nome = f"{self.get_tipo_display()} - Lote {self.lote.numero_lote}"

        self.full_clean()

        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.lote} - {self.tipo} ({self.quantidade})"
