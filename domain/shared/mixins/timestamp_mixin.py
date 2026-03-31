"""Campos de carimbo de tempo reutilizáveis para modelos Django."""

from django.db import models


class TimestampMixin(models.Model):
    """Adiciona colunas de criação e atualização automáticas."""

    created_at = models.DateTimeField(db_column="created_at", auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(db_column="updated_at", auto_now=True)

    class Meta:
        abstract = True
