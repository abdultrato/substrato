from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from nucleo.modelos.base import NoNameCoreModel


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
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="gestacoes",
        db_index=True,
    )
    medico_responsavel = models.ForeignKey(
        "recursos_humanos.Funcionario",
        verbose_name="Médico/Ginecologista responsável",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="gestacoes_responsavel",
        db_index=True,
    )

    data_ultima_menstruacao = models.DateField(
        verbose_name="Data da última menstruação",
        null=True,
        blank=True,
    )
    data_prevista_parto = models.DateField(
        verbose_name="Data prevista do parto",
        null=True,
        blank=True,
    )

    bercario = models.CharField(
        verbose_name="Berçário",
        max_length=80,
        blank=True,
        default="",
        help_text="Identificação do berçário/ala/sala (quando aplicável).",
    )
    cama_maternidade = models.CharField(
        verbose_name="Cama na maternidade",
        max_length=40,
        blank=True,
        default="",
        help_text="Número/identificação da cama (quando aplicável).",
    )

    partos_totais = models.PositiveSmallIntegerField(
        verbose_name="Partos totais",
        default=0,
        help_text="Histórico obstétrico: total de partos já realizados.",
    )
    partos_normais = models.PositiveSmallIntegerField(
        verbose_name="Partos normais",
        default=0,
        help_text="Histórico obstétrico: total de partos vaginais.",
    )
    cesarianas = models.PositiveSmallIntegerField(
        verbose_name="Cesarianas",
        default=0,
        help_text="Histórico obstétrico: total de partos por cesariana.",
    )

    estado = models.CharField(
        verbose_name="Estado",
        max_length=10,
        choices=Estado.choices,
        default=Estado.ACOMPANHAMENTO,
        db_index=True,
    )

    observacoes = models.TextField(verbose_name="Observações", blank=True, default="")
    criado_em = models.DateTimeField(verbose_name="Criado em", default=timezone.now, db_index=True)

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
            raise ValidationError({"paciente": "Paciente e gestação devem pertencer ao mesmo inquilino."})

        if (
            self.medico_responsavel_id
            and self.inquilino_id
            and self.medico_responsavel.inquilino_id != self.inquilino_id
        ):
            raise ValidationError({"medico_responsavel": "Médico e gestação devem pertencer ao mesmo inquilino."})

        if self.partos_normais > self.partos_totais:
            raise ValidationError({"partos_normais": "Partos normais não pode ser maior que partos totais."})

        if self.cesarianas > self.partos_totais:
            raise ValidationError({"cesarianas": "Cesarianas não pode ser maior que partos totais."})

        if (self.partos_normais + self.cesarianas) > self.partos_totais:
            raise ValidationError(
                {"partos_totais": "Partos totais deve ser maior ou igual à soma de partos normais + cesarianas."}
            )

    def save(self, *args, **kwargs):
        if not self.inquilino_id and self.paciente_id:
            self.inquilino_id = self.paciente.inquilino_id
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.id_custom or f"Gestação {self.pk}"
