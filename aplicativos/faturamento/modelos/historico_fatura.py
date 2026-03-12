from django.db import models

from nucleo.modelos.base import CoreModel


class HistoricoFatura(CoreModel):
    prefixo = "HFAT"

    fatura = models.ForeignKey(
        "faturamento.Fatura",
        on_delete=models.CASCADE,
        related_name="historico",
        db_index=True,
    )

    tipo_evento = models.CharField(max_length=40, db_index=True)
    descricao = models.TextField(blank=True, default="")

    class Meta:
        verbose_name = "Histórico de Fatura"
        verbose_name_plural = "Históricos de Fatura"
        ordering = ["-criado_em"]
        indexes = [
            models.Index(fields=["fatura", "criado_em"]),
            models.Index(fields=["tipo_evento"]),
        ]

    def __str__(self) -> str:
        return self.nome or f"{self.fatura_id} - {self.tipo_evento}"

