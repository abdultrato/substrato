from decimal import Decimal as d

from django.db import models as m

from .nucleo import CoreModel as cm
from .fields import MoneyField as mf


class Fatura(cm):
    """
    Documento financeiro vinculado a uma requisição.

    Estrutura preparada para:
    ✓ múltiplas seguradoras
    ✓ múltiplos pagamentos
    ✓ auditoria financeira
    ✓ conciliação bancária
    ✓ faturamento corporativo
    ✓ escala multi-clínica
    """

    prefixo = "FAT"

    requisicao = m.OneToOneField(
        "frontend.RequisicaoAnalise",
        on_delete=m.CASCADE,
        related_name="fatura",
    )

    paciente = m.ForeignKey(
        "frontend.Paciente",
        on_delete=m.PROTECT,
        related_name="faturas",
    )

    # =========================================================
    # TOTAIS FINANCEIROS
    # =========================================================

    subtotal = mf(default=0)
    iva_valor = mf(default=0)
    total = mf(default=0)
    valor_seguro = mf(default=0)
    valor_paciente = mf(default=0)
    estado = m.CharField()
    emitida_em = m.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Fatura"
        verbose_name_plural = "Faturas"
        ordering = ["-criado_em"]
        indexes = [
            m.Index(fields=["estado"]),
            m.Index(fields=["criado_em"]),
            m.Index(fields=["deletado"]),
            m.Index(fields=["ativo"]),
        ]

    def __str__(self):
        return f"{self.id_custom} - {self.paciente}"

    # =========================================================
    # PROPRIEDADES FINANCEIRAS
    # =========================================================

    @property
    def total_pago(self):
        """
        Soma de todos os pagamentos confirmados.
        """
        return sum(
            (p.valor for p in self.pagamentos.all()),
            d("0.00"),
        )

    @property
    def saldo_pendente(self):
        """
        Valor ainda não pago.
        """
        return (self.total - self.total_pago).quantize(d("0.01"))

    @property
    def esta_pago(self):
        """
        Indica se a fatura está totalmente quitada.
        """
        return self.saldo_pendente <= d("0.00")

    # =========================================================
    # STATUS FINANCEIRO AUTOMÁTICO
    # =========================================================

    def atualizar_estado_pagamento(self):
        """
        Atualiza o estado com base nos pagamentos.
        """
        if not self.esta_pago or self.estado == self.Estado.PAGA:
            return

        self.estado = self.Estado.PAGA
        self.save(update_fields=["estado"])

    # =========================================================
    # RECÁLCULO FINANCEIRO
    # =========================================================

    def recalcular_totais(self):
        """
        Delegado ao motor financeiro.
        """
        from frontend.billing.services.calculos import calcular_totais

        calcular_totais(self)
