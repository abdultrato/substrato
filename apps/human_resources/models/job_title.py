from __future__ import annotations

from django.db import models

from core.models.base import CoreModel


class JobTitle(CoreModel):
    """
    Cargo/função do funcionário (MVP).
    """

    prefix = "CRG"

    description = models.TextField(
        db_column="description",
        verbose_name="Descrição",
        blank=True, default="")

    # Usado para filtrar médicos no agendamento de consultations.
    is_doctor = models.BooleanField(
        db_column="is_doctor",
        verbose_name="É médico",
        default=False, db_index=True)

    class Meta:
        db_table = "recursos_humanos_cargo"
        verbose_name = "Cargo"
        verbose_name_plural = "Cargos"
        ordering = ["name"]
