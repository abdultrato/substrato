"""Perfis ocupacionais (bandejas de exames por profissão) para medicina do trabalho."""

from django.db import models

from core.models.base import CoreModel

from .lab_exam import LabExam


class OccupationalExamProfile(CoreModel):
    """
    Bandeja de exames associada a um perfil profissional.

    Cada perfil corresponde a um tipo de profissão (ex.: motorista,
    cozinheiro, operário) e define o conjunto de exames laboratoriais
    recomendados para requisições de medicina ocupacional.
    """

    prefix = "PER"  # Prefixo para IDs amigáveis

    profession = models.CharField(
        db_column="profession",
        max_length=150,
        blank=True,
        default="",
        db_index=True,
        verbose_name="Profissão",
        help_text="Profissão a que o perfil se destina (ex.: motorista, cozinheiro).",
    )

    description = models.TextField(
        db_column="description",
        blank=True,
        default="",
        verbose_name="Descrição",
        help_text="Notas sobre o âmbito do perfil ocupacional.",
    )

    active = models.BooleanField(
        db_column="active",
        default=True,
        db_index=True,
        verbose_name="Ativo",
    )

    exams = models.ManyToManyField(
        LabExam,
        blank=True,
        related_name="occupational_profiles",
        verbose_name="Exames do perfil",
        help_text="Conjunto de exames laboratoriais da bandeja deste perfil.",
    )

    class Meta:
        db_table = "clinico_perfil_ocupacional"
        ordering = ["name"]
        verbose_name = "Perfil ocupacional de exames"
        verbose_name_plural = "Perfis ocupacionais de exames"

    def __str__(self):
        return f"{self.name} ({self.profession})" if self.profession else self.name
