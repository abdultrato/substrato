from __future__ import annotations

from django.db import models

from core.models.base import CoreModel


class JobTitle(CoreModel):
    """
    Cargo/função do funcionário (MVP).
    """

    prefix = "CRG"  # Prefixo para custom_id

    description = models.TextField(  # Descrição interna do cargo
        db_column="description",
        verbose_name="Descrição",
        blank=True,
        default="",
    )

    # Usado para filtrar médicos no agendamento de consultas.
    is_doctor = models.BooleanField(
        db_column="is_doctor",
        verbose_name="É médico",
        default=False,
        db_index=True,
    )

    class Meta:
        db_table = "recursos_humanos_cargo"  # Nome de tabela legada
        verbose_name = "Cargo"
        verbose_name_plural = "Cargos"
        ordering = ["name"]  # Ordenação padrão
