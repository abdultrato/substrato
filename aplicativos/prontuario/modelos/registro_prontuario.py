from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from nucleo.modelos.base import NoNameCoreModel


class RegistroProntuario(NoNameCoreModel):
    """
    Cardex (registro de prontuário/anamnese/evolução).

    MVP:
    - sintomas / diagnóstico / prescrição / relatório como campos texto
    - vínculo opcional a uma ou mais consultas

    Futuro:
    - normalizar em entidades (Diagnóstico, Prescrição, etc.)
    - anexos (PDF/imagens)
    """

    prefixo = "PRT"

    class Estado(models.TextChoices):
        RASCUNHO = "RASCUNHO", "Rascunho"
        FINALIZADO = "FINALIZADO", "Finalizado"
        CANCELADO = "CANCELADO", "Cancelado"

    paciente = models.ForeignKey(
        "clinico.Paciente",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="registros_prontuario",
        db_index=True,
    )
    medico = models.ForeignKey(
        "recursos_humanos.Funcionario",
        verbose_name="Médico",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="registros_prontuario",
        db_index=True,
    )

    consultas = models.ManyToManyField(
        "consultas.ConsultaMedica",
        verbose_name="Consultas",
        blank=True,
        related_name="cardex_registros",
    )

    inicio_atendimento = models.DateTimeField(
        verbose_name="Início do atendimento",
        default=timezone.now,
        db_index=True,
    )
    fim_atendimento = models.DateTimeField(
        verbose_name="Fim do atendimento",
        null=True,
        blank=True,
        db_index=True,
    )
    estado = models.CharField(
        verbose_name="Estado",
        max_length=20,
        choices=Estado.choices,
        default=Estado.RASCUNHO,
        db_index=True,
    )

    sintomas = models.TextField(verbose_name="Sintomas", blank=True, default="")
    diagnostico = models.TextField(verbose_name="Diagnóstico", blank=True, default="")
    prescricao = models.TextField(
        verbose_name="Observações da prescrição",
        blank=True,
        default="",
        help_text="Texto livre opcional. A prescrição estruturada fica nos itens de prescrição.",
    )
    relatorio_medico = models.TextField(verbose_name="Relatório médico", blank=True, default="")

    class Meta:
        verbose_name = "Cardex"
        verbose_name_plural = "Cardex"
        ordering = ["-inicio_atendimento", "-criado_em"]
        indexes = [
            models.Index(fields=["inquilino", "paciente", "inicio_atendimento"]),
            models.Index(fields=["inquilino", "medico", "inicio_atendimento"]),
            models.Index(fields=["inquilino", "estado", "inicio_atendimento"]),
        ]

    def clean(self):
        super().clean()

        if self.paciente_id and self.inquilino_id and self.paciente.inquilino_id != self.inquilino_id:
            raise ValidationError({"paciente": "Paciente e prontuário devem pertencer ao mesmo inquilino."})

        if self.medico_id and self.inquilino_id and self.medico.inquilino_id != self.inquilino_id:
            raise ValidationError({"medico": "Médico e prontuário devem pertencer ao mesmo inquilino."})

        if self.fim_atendimento and self.inicio_atendimento and self.fim_atendimento < self.inicio_atendimento:
            raise ValidationError({"fim_atendimento": "Fim do atendimento não pode ser anterior ao início."})

    def save(self, *args, **kwargs):
        if not self.inquilino_id and self.paciente_id:
            self.inquilino_id = self.paciente.inquilino_id
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.id_custom or f"Cardex {self.pk}"
