from __future__ import annotations

from django.db import models

from nucleo.modelos.base import CoreModel


class Cargo(CoreModel):
    """
    Cargo/função do funcionário (MVP).
    """

    prefixo = "CRG"

    descricao = models.TextField(blank=True, default="")

    # Usado para filtrar médicos no agendamento de consultas.
    eh_medico = models.BooleanField(default=False, db_index=True)

    class Meta:
        verbose_name = "Cargo"
        verbose_name_plural = "Cargos"
        ordering = ["nome"]
