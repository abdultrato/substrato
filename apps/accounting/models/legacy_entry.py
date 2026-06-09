"""Modelos legados de lançamento contábil (para compatibilidade)."""

from decimal import Decimal

from django.core.exceptions import ValidationError  # Erros de domínio
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
        "Data da transação",  # Rótulo
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

    def confirm(self):
        """Posta o lançamento validando a partida dobrada (§18.9)."""
        if self.confirmed:
            raise ValidationError("Lançamento já confirmado.")
        movimentos = list(self.movimentos.all())
        if len(movimentos) < 2:
            raise ValidationError("Lançamento precisa de pelo menos dois movimentos (débito e crédito).")
        total_debit = sum((m.debit or Decimal("0.00")) for m in movimentos)
        total_credit = sum((m.credit or Decimal("0.00")) for m in movimentos)
        if total_debit != total_credit:
            raise ValidationError("Partida dobrada: total de débitos deve igualar o total de créditos.")
        if total_debit <= Decimal("0.00"):
            raise ValidationError("Lançamento sem valor.")
        self.confirmed = True
        self.save(update_fields=["confirmed", "updated_at"])
        return self

    def unconfirm(self):
        """Reabre um lançamento confirmado para correção."""
        if not self.confirmed:
            raise ValidationError("Lançamento já está aberto.")
        self.confirmed = False
        self.save(update_fields=["confirmed", "updated_at"])
        return self
