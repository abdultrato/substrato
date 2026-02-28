from decimal import Decimal

from django.db import models

from aplicativos.faturamento.modelos.fatura import Fatura


class ConciliacaoFinanceira(models.Model):
    fatura = models.ForeignKey(
        Fatura,
        on_delete=models.CASCADE,
        related_name="conciliacoes",
    )
    valor_registrado = models.DecimalField(max_digits=12, decimal_places=2)
    valor_recebido = models.DecimalField(max_digits=12, decimal_places=2)
    divergencia = models.DecimalField(max_digits=12, decimal_places=2)
    conciliado = models.BooleanField(default=False, db_index=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-criado_em"]
        indexes = [
            models.Index(fields=["fatura"]),
            models.Index(fields=["conciliado"]),
            models.Index(fields=["criado_em"]),
        ]

    def __str__(self):
        return f"Conciliacao {self.fatura_id} ({'ok' if self.conciliado else 'divergente'})"


def conciliar_fatura(fatura, valor_recebido):
    valor_recebido = Decimal(valor_recebido).quantize(Decimal("0.01"))
    valor_registrado = (fatura.total or Decimal("0.00")).quantize(Decimal("0.01"))

    divergencia = (valor_registrado - valor_recebido).quantize(Decimal("0.01"))
    conciliado = divergencia == Decimal("0.00")

    return ConciliacaoFinanceira.objects.create(
        fatura=fatura,
        valor_registrado=valor_registrado,
        valor_recebido=valor_recebido,
        divergencia=divergencia,
        conciliado=conciliado,
    )
