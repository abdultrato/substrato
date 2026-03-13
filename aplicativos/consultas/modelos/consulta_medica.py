from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from infrastrutura.orm.fields.dinheiro_field import DinheiroField
from nucleo.modelos.base import NoNameCoreModel

User = settings.AUTH_USER_MODEL


class ConsultaMedica(NoNameCoreModel):
    """
    App comercial: consultas médicas (marcação + registro).

    - Relaciona paciente e médico
    - Guarda preço da consulta
    - Permite vincular faturamento (via Fatura.origem=CONSULTA)
    """

    prefixo = "CONS"

    class Estado(models.TextChoices):
        MARCADA = "MARCADA", "Marcada"
        CONCLUIDA = "CONCLUIDA", "Concluída"
        CANCELADA = "CANCELADA", "Cancelada"

    paciente = models.ForeignKey(
        "clinico.Paciente",
        on_delete=models.PROTECT,
        related_name="consultas_medicas",
        db_index=True,
    )
    medico = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="consultas_realizadas",
        db_index=True,
    )

    tipo = models.CharField(max_length=120, db_index=True)
    descricao = models.TextField(blank=True, default="")

    agendada_para = models.DateTimeField(default=timezone.now, db_index=True)
    estado = models.CharField(
        max_length=20,
        choices=Estado.choices,
        default=Estado.MARCADA,
        db_index=True,
    )

    preco = DinheiroField(default=Decimal("0.00"))

    concluida_em = models.DateTimeField(null=True, blank=True)
    cancelada_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Consulta Médica"
        verbose_name_plural = "Consultas Médicas"
        ordering = ["-agendada_para", "-criado_em"]
        indexes = [
            models.Index(fields=["inquilino", "paciente", "agendada_para"]),
            models.Index(fields=["inquilino", "medico", "agendada_para"]),
            models.Index(fields=["inquilino", "estado", "agendada_para"]),
            models.Index(fields=["inquilino", "tipo"]),
        ]

    def clean(self):
        super().clean()

        if not (self.tipo or "").strip():
            raise ValidationError({"tipo": "Informe o tipo/nome do serviço da consulta."})

        if self.preco is None or self.preco < Decimal("0.00"):
            raise ValidationError({"preco": "Preço inválido."})

        if self.paciente_id and self.inquilino_id and self.paciente.inquilino_id != self.inquilino_id:
            raise ValidationError({"paciente": "Paciente e consulta devem pertencer ao mesmo inquilino."})

        if self.medico_id and self.inquilino_id and self.medico.inquilino_id != self.inquilino_id:
            raise ValidationError({"medico": "Médico e consulta devem pertencer ao mesmo inquilino."})

    def save(self, *args, **kwargs):
        if not self.inquilino_id and self.paciente_id:
            self.inquilino_id = self.paciente.inquilino_id
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.id_custom} - {self.paciente.nome} ({self.tipo})"

