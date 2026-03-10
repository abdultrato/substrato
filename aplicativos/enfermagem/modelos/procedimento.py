from django.conf import settings
from django.db import models
from django.utils import timezone

from nucleo.modelos.base import NoNameCoreModel

User = settings.AUTH_USER_MODEL


class Procedimento(NoNameCoreModel):
    prefixo = "PROC"

    paciente = models.ForeignKey(
        "clinico.Paciente",
        on_delete=models.PROTECT,
        related_name="procedimentos_enfermagem",
        db_index=True,
    )
    profissional = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="procedimentos_realizados",
    )
    data_realizacao = models.DateTimeField(default=timezone.now, db_index=True)
    observacoes = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-data_realizacao", "-criado_em"]
        verbose_name = "Procedimento"
        verbose_name_plural = "Procedimentos"
        indexes = [
            models.Index(fields=["inquilino", "paciente"]),
            models.Index(fields=["data_realizacao"]),
        ]

    def save(self, *args, **kwargs):
        if not self.inquilino_id and self.paciente_id:
            self.inquilino_id = self.paciente.inquilino_id
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.id_custom} - {self.paciente.nome}"
