from __future__ import annotations

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from nucleo.modelos.base import NoNameCoreModel

User = settings.AUTH_USER_MODEL


class Gestacao(NoNameCoreModel):
    """
    Acompanhamento básico de gestação (MVP).

    Campos e regras podem ser expandidos (pré-natal, exames, partos, etc.).
    """

    prefixo = "MAT"

    class Estado(models.TextChoices):
        ACOMPANHAMENTO = "ACOMP", "Em acompanhamento"
        PARTO = "PARTO", "Parto realizado"
        ENCERRADA = "ENCERR", "Encerrada"
        CANCELADA = "CANCEL", "Cancelada"

    paciente = models.ForeignKey(
        "clinico.Paciente",
        on_delete=models.PROTECT,
        related_name="gestacoes",
        db_index=True,
    )
    medico_responsavel = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="gestacoes_responsavel",
        db_index=True,
    )

    data_ultima_menstruacao = models.DateField(null=True, blank=True)
    data_prevista_parto = models.DateField(null=True, blank=True)

    estado = models.CharField(
        max_length=10,
        choices=Estado.choices,
        default=Estado.ACOMPANHAMENTO,
        db_index=True,
    )

    observacoes = models.TextField(blank=True, default="")
    criado_em = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        verbose_name = "Gestação"
        verbose_name_plural = "Gestações"
        ordering = ["-criado_em", "-id"]
        indexes = [
            models.Index(fields=["inquilino", "paciente", "criado_em"]),
            models.Index(fields=["inquilino", "estado", "criado_em"]),
        ]

    def clean(self):
        super().clean()

        if self.paciente_id and self.inquilino_id and self.paciente.inquilino_id != self.inquilino_id:
            raise ValidationError(
                {"paciente": "Paciente e gestação devem pertencer ao mesmo inquilino."}
            )

        if (
            self.medico_responsavel_id
            and self.inquilino_id
            and self.medico_responsavel.inquilino_id != self.inquilino_id
        ):
            raise ValidationError(
                {"medico_responsavel": "Médico e gestação devem pertencer ao mesmo inquilino."}
            )

    def save(self, *args, **kwargs):
        if not self.inquilino_id and self.paciente_id:
            self.inquilino_id = self.paciente.inquilino_id
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.id_custom or f"Gestação {self.pk}"

