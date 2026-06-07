from __future__ import annotations

from django.db import models

from core.models.base import CoreModel


class JobTitle(CoreModel):
    """Cargo/função na estrutura organizacional."""

    prefix = "CRG"

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Ativo"
        INACTIVE = "INACTIVE", "Inativo"
        VACANT = "VACANT", "Vago"
        ARCHIVED = "ARCHIVED", "Arquivado"

    description = models.TextField(
        db_column="description",
        verbose_name="Descrição",
        blank=True,
        default="",
    )
    is_doctor = models.BooleanField(
        db_column="is_doctor",
        verbose_name="É médico",
        default=False,
        db_index=True,
    )
    hierarchy_level = models.PositiveSmallIntegerField(
        db_column="hierarchy_level",
        verbose_name="Nível hierárquico",
        null=True,
        blank=True,
        help_text="1 = topo da hierarquia (ex.: Director Geral).",
    )
    reports_to = models.ForeignKey(
        "self",
        db_column="reports_to_id",
        verbose_name="Reporta a",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subordinates",
        db_index=True,
    )
    salary_grade = models.CharField(
        db_column="salary_grade",
        verbose_name="Nível salarial",
        max_length=40,
        blank=True,
        default="",
    )
    responsibilities = models.TextField(
        db_column="responsibilities",
        verbose_name="Responsabilidades",
        blank=True,
        default="",
    )
    status = models.CharField(
        db_column="status",
        verbose_name="Estado",
        max_length=10,
        choices=Status.choices,
        default=Status.ACTIVE,
        db_index=True,
    )

    class Meta:
        db_table = "recursos_humanos_cargo"
        verbose_name = "Cargo"
        verbose_name_plural = "Cargos"
        ordering = ["hierarchy_level", "name"]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "hierarchy_level"]),
        ]
