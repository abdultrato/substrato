"""Modelos legados de lançamento contábil (para compatibilidade)."""

from django.db import models  # ORM
from django.utils import timezone  # Datas

from core.models.base import CoreModel  # Modelo base


class LegacyEntry(CoreModel):
    """
    Lançamento contábil legado (mantido por compatibilidade).
    """

    prefix = "LAN"  # Prefixo para IDs legados

    description = models.TextField(
        "Descrição",  # Rótulo
        db_column="description",  # Coluna
        blank=True,
        default="",
    )
    date = models.DateField(
        "Data",  # Rótulo
        db_column="date",  # Coluna
        default=timezone.localdate,  # Data padrão = hoje
        db_index=True,
    )
    external_reference = models.CharField(
        "Referência externa",  # Rótulo
        db_column="external_reference",  # Coluna
        max_length=120,
        blank=True,
        default="",
        db_index=True,
    )
    confirmed = models.BooleanField(
        "Confirmado",  # Rótulo
        db_column="confirmed",  # Coluna
        default=False,
        db_index=True,
    )

    class Meta:
        db_table = "contabilidade_lancamento"  # Nome da tabela
        verbose_name = "Lançamento legado"
        verbose_name_plural = "Lançamentos legados"
        ordering = ["-date", "-created_at"]  # Mais novos primeiro
        indexes = [
            models.Index(fields=["tenant", "date"]),
            models.Index(fields=["tenant", "confirmed"]),
            models.Index(fields=["external_reference"]),
        ]

    def __str__(self) -> str:
        """Retorna identificação legível."""
        return self.name or self.external_reference or f"Lancamento {self.pk}"
