from django.core.exceptions import ValidationError
from django.db import models

from nucleo.modelos.base import NoNameCoreModel


class ProcedimentoItem(NoNameCoreModel):
    prefixo = "PROCIT"

    procedimento = models.ForeignKey(
        "enfermagem.Procedimento",
        on_delete=models.CASCADE,
        related_name="itens",
        db_index=True,
    )
    descricao = models.CharField(max_length=255, db_index=True)
    quantidade = models.PositiveIntegerField(default=1)
    realizado = models.BooleanField(default=True, db_index=True)
    observacao = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-criado_em"]
        verbose_name = "Item de Procedimento"
        verbose_name_plural = "Itens de Procedimento"
        indexes = [
            models.Index(fields=["inquilino", "procedimento"]),
            models.Index(fields=["descricao"]),
        ]

    def clean(self):
        super().clean()
        if self.quantidade <= 0:
            raise ValidationError({"quantidade": "Quantidade deve ser maior que zero."})

    def save(self, *args, **kwargs):
        if not self.inquilino_id and self.procedimento_id:
            self.inquilino_id = self.procedimento.inquilino_id
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.descricao} x{self.quantidade}"
