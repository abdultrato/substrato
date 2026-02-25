from decimal import Decimal

from django.db import models

from ..models.core import CoreModel
from ..models.exame import Exame
from ..models.fields import MoneyField
from ..models.mixins import CustomIDSaveMixin
from ..models.paciente import Paciente
from ..models.requisicao_analise import RequisicaoAnalise
from .entidade import Entidade


class Fatura(CustomIDSaveMixin, CoreModel):
    """
    Fatura financeira vinculada a uma requisição.
    """

    prefixo = "FAT"

    class TipoPagamento(models.TextChoices):
        DIRETO = "DIR", "Direto"
        SEGURO = "SEG", "Seguro"

    class Estado(models.TextChoices):
        RASCUNHO = "RASC", "Rascunho"
        EMITIDA = "EMIT", "Emitida"
        PAGA = "PAGA", "Paga"
        ANULADA = "ANUL", "Anulada"

    requisicao = models.OneToOneField(
        RequisicaoAnalise,
        on_delete=models.CASCADE,
        related_name="fatura",
    )

    paciente = models.ForeignKey(
        Paciente,
        on_delete=models.PROTECT,
        related_name="faturas",
    )

    tipo_pagamento = models.CharField(
        max_length=4,
        choices=TipoPagamento.choices,
        default=TipoPagamento.DIRETO,
    )

    seguradora = models.ForeignKey(
        Entidade,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="faturas",
    )

    cobertura_seguro_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    codigo_autorizacao = models.CharField(
        max_length=80,
        blank=True,
        null=True,
    )

    isento_iva = models.BooleanField(default=False)

    subtotal = MoneyField(default=0)
    iva_valor = MoneyField(default=0)
    total = MoneyField(default=0)
    valor_seguro = MoneyField(default=0)
    valor_paciente = MoneyField(default=0)

    estado = models.CharField(
        max_length=5,
        choices=Estado.choices,
        default=Estado.RASCUNHO,
    )

    emitida_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Fatura"
        verbose_name_plural = "Faturas"
        ordering = ["-criado_em"]
        indexes = [
            models.Index(fields=["estado"]),
            models.Index(fields=["criado_em"]),
        ]

    def __str__(self):
        return f"{self.id_custom} - {self.paciente.nome}"

    IVA_PERCENT = Decimal("0.16")

    def recalcular_totais(self, save=True):
        itens = self.itens.all()

        subtotal = sum((i.total_linha for i in itens), Decimal("0.00"))

        iva_base = Decimal("0.00")
        for i in itens:
            if not self.isento_iva and not i.isento_iva:
                iva_base += i.total_linha

        iva_valor = Decimal("0.00")
        if not self.isento_iva:
            iva_valor = (iva_base * self.IVA_PERCENT).quantize(Decimal("0.01"))

        total = (subtotal + iva_valor).quantize(Decimal("0.01"))

        valor_seguro = Decimal("0.00")
        valor_paciente = total

        if self.tipo_pagamento == self.TipoPagamento.SEGURO:
            perc = (self.cobertura_seguro_percent or Decimal("0.00")) / Decimal(
                "100.00"
            )
            valor_seguro = (total * perc).quantize(Decimal("0.01"))
            valor_paciente = (total - valor_seguro).quantize(Decimal("0.01"))

        self.subtotal = subtotal
        self.iva_valor = iva_valor
        self.total = total
        self.valor_seguro = valor_seguro
        self.valor_paciente = valor_paciente

        if save:
            self.save(
                update_fields=[
                    "subtotal",
                    "iva_valor",
                    "total",
                    "valor_seguro",
                    "valor_paciente",
                    "atualizado_em",
                ]
            )


class FaturaItem(models.Model):
    fatura = models.ForeignKey(
        Fatura,
        on_delete=models.CASCADE,
        related_name="itens",
    )

    exame = models.ForeignKey(
        Exame,
        on_delete=models.PROTECT,
    )

    descricao = models.CharField(
        max_length=200,
        blank=True,
    )

    quantidade = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("1.00"),
    )

    preco_unitario = MoneyField(default=0)

    isento_iva = models.BooleanField(default=False)

    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Item da Fatura"
        verbose_name_plural = "Itens da Fatura"
        unique_together = ("fatura", "exame")

    def __str__(self):
        return f"{self.descricao or self.exame.nome} ({self.quantidade}x)"

    @property
    def total_linha(self):
        return (self.quantidade * self.preco_unitario).quantize(Decimal("0.01"))

    def save(self, *args, **kwargs):
        if self.exame and not self.descricao:
            self.descricao = self.exame.nome

        if self.exame and not self.preco_unitario:
            self.preco_unitario = self.exame.preco

        super().save(*args, **kwargs)

        if self.fatura_id:
            self.fatura.recalcular_totais(save=True)
