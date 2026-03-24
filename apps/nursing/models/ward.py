from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models.base import CoreModel, NoNameCoreModel


class Ward(CoreModel):
    """
    Enfermaria (setor/ala) para gestão de camas e internamentos.
    """

    prefixo = "ENF"

    descricao = models.TextField(verbose_name="Descrição", blank=True, default="")
    ativa = models.BooleanField(verbose_name="Ativa", default=True, db_index=True)

    class Meta:
        verbose_name = "Enfermaria"
        verbose_name_plural = "Enfermarias"
        ordering = ["nome"]
        indexes = [
            models.Index(fields=["inquilino", "ativa", "nome"]),
        ]

    def __str__(self) -> str:
        return self.nome or (self.id_custom or f"Enfermaria {self.pk}")


class WardBed(NoNameCoreModel):
    """
    Cama vinculada a uma enfermaria.
    """

    prefixo = "CAMA"

    enfermaria = models.ForeignKey(
        Ward,
        verbose_name="Enfermaria",
        on_delete=models.PROTECT,
        related_name="camas",
        db_index=True,
    )

    numero = models.CharField(
        verbose_name="Número da cama",
        max_length=20,
        db_index=True,
    )

    ativa = models.BooleanField(verbose_name="Ativa", default=True, db_index=True)

    class Meta:
        verbose_name = "Cama"
        verbose_name_plural = "Camas"
        ordering = ["enfermaria__nome", "numero", "-criado_em"]
        indexes = [
            models.Index(fields=["inquilino", "enfermaria", "numero"]),
            models.Index(fields=["inquilino", "ativa", "criado_em"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["inquilino", "enfermaria", "numero"],
                name="uniq_cama_enfermaria_numero_por_inquilino",
            ),
        ]

    def clean(self):
        super().clean()
        if self.enfermaria_id and self.inquilino_id and self.enfermaria.inquilino_id != self.inquilino_id:
            raise ValidationError({"enfermaria": "Enfermaria e cama devem pertencer ao mesmo inquilino."})

    def save(self, *args, **kwargs):
        if not self.inquilino_id and self.enfermaria_id:
            self.inquilino_id = self.enfermaria.inquilino_id
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"Cama {self.numero} ({self.enfermaria})"


class WardAdmission(NoNameCoreModel):
    """
    Internamento (ocupação) de uma cama por um paciente.

    MVP: inclui próxima medicação como campo (pode ser alimentado pela enfermagem).
    """

    prefixo = "INT"

    cama = models.ForeignKey(
        WardBed,
        verbose_name="Cama",
        on_delete=models.PROTECT,
        related_name="internamentos",
        db_index=True,
    )

    paciente = models.ForeignKey(
        "clinico.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="internamentos_enfermaria",
        db_index=True,
    )

    tempo_estimado_observacao_horas = models.PositiveSmallIntegerField(
        verbose_name="Tempo estimado de observação (horas)",
        null=True,
        blank=True,
        help_text="Tempo estimado de observação em horas (quando aplicável).",
    )

    data_internamento = models.DateTimeField(
        verbose_name="Data de internamento",
        default=timezone.now,
        db_index=True,
    )

    data_prevista_alta = models.DateTimeField(
        verbose_name="Data prevista para alta",
        null=True,
        blank=True,
        db_index=True,
    )

    alta_em = models.DateTimeField(
        verbose_name="Data de alta",
        null=True,
        blank=True,
        db_index=True,
    )

    proxima_medicacao_em = models.DateTimeField(
        verbose_name="Horário da próxima medicação",
        null=True,
        blank=True,
        db_index=True,
    )

    proxima_medicacao_descricao = models.CharField(
        verbose_name="Descrição da próxima medicação",
        max_length=160,
        blank=True,
        default="",
    )

    ativo = models.BooleanField(
        verbose_name="Internamento ativo",
        default=True,
        db_index=True,
    )

    observacoes = models.TextField(verbose_name="Observações", blank=True, default="")

    class Meta:
        verbose_name = "Internamento (Enfermaria)"
        verbose_name_plural = "Internamentos (Enfermaria)"
        ordering = ["-data_internamento", "-criado_em"]
        indexes = [
            models.Index(fields=["inquilino", "ativo", "data_internamento"]),
            models.Index(fields=["inquilino", "cama", "ativo"]),
            models.Index(fields=["inquilino", "paciente", "data_internamento"]),
            models.Index(fields=["inquilino", "proxima_medicacao_em"]),
        ]

    def clean(self):
        super().clean()

        if self.cama_id and self.inquilino_id and self.cama.inquilino_id != self.inquilino_id:
            raise ValidationError({"cama": "Cama e internamento devem pertencer ao mesmo inquilino."})

        if self.paciente_id and self.inquilino_id and self.paciente.inquilino_id != self.inquilino_id:
            raise ValidationError({"paciente": "Paciente e internamento devem pertencer ao mesmo inquilino."})

        if self.data_prevista_alta and self.data_internamento and self.data_prevista_alta < self.data_internamento:
            raise ValidationError(
                {"data_prevista_alta": "Data prevista para alta não pode ser anterior ao internamento."}
            )

        if self.alta_em and self.data_internamento and self.alta_em < self.data_internamento:
            raise ValidationError({"alta_em": "Data de alta não pode ser anterior ao internamento."})

        if self.ativo and self.cama_id:
            qs = self.__class__.all_objects.filter(
                cama_id=self.cama_id,
                ativo=True,
                deletado=False,
            )
            if self.pk:
                qs = qs.exclude(pk=self.pk)
            if qs.exists():
                raise ValidationError({"cama": "Esta cama já possui um internamento ativo."})

    def save(self, *args, **kwargs):
        if not self.inquilino_id:
            if self.cama_id:
                self.inquilino_id = self.cama.inquilino_id
            elif self.paciente_id:
                self.inquilino_id = self.paciente.inquilino_id
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.id_custom or self.pk} - {self.paciente} ({self.cama})"
