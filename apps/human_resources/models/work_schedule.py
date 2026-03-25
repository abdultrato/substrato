from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models

from core.models.base import NoNameCoreModel


class WorkSchedule(NoNameCoreModel):
    """
    Horário de trabalho semanal por funcionário (MVP).
    """

    prefixo = "HRT"

    class DiaSemana(models.IntegerChoices):
        SEGUNDA = 0, "Segunda"
        TERCA = 1, "Terça"
        QUARTA = 2, "Quarta"
        QUINTA = 3, "Quinta"
        SEXTA = 4, "Sexta"
        SABADO = 5, "Sábado"
        DOMINGO = 6, "Domingo"

    funcionario = models.ForeignKey(
        "recursos_humanos.Employee",
        on_delete=models.CASCADE,
        related_name="horarios",
        db_index=True,
    )

    dia_semana = models.IntegerField(choices=DiaSemana.choices, db_index=True)
    hora_inicio = models.TimeField()
    hora_fim = models.TimeField()
    ativo = models.BooleanField(default=True, db_index=True)

    class Meta:
        db_table = "recursos_humanos_horariotrabalho"
        verbose_name = "Horário de Trabalho"
        verbose_name_plural = "Horários de Trabalho"
        ordering = ["funcionario", "dia_semana", "hora_inicio"]
        indexes = [
            models.Index(fields=["inquilino", "funcionario", "dia_semana"]),
        ]

    def clean(self):
        super().clean()

        if self.funcionario_id and self.inquilino_id and self.funcionario.inquilino_id != self.inquilino_id:
            raise ValidationError({"funcionario": "Funcionário e horário devem pertencer ao mesmo inquilino."})

        if self.hora_inicio and self.hora_fim and self.hora_inicio >= self.hora_fim:
            raise ValidationError({"hora_fim": "Hora fim deve ser maior que hora início."})

    def save(self, *args, **kwargs):
        if not self.inquilino_id and self.funcionario_id:
            self.inquilino_id = self.funcionario.inquilino_id
        self.full_clean()
        return super().save(*args, **kwargs)
