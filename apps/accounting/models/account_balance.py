"""Snapshot materializado de saldo de conta."""

from decimal import Decimal  # Para valores monetários

from django.core.validators import MinValueValidator  # Validador de mínimo
from django.db import models  # ORM


class AccountBalance(models.Model):
    """Armazena o saldo atual da conta."""

    account = models.OneToOneField(
        "contabilidade.Account",  # Conta associada
        verbose_name="Conta",  # Rótulo
        db_column="account_id",  # Coluna
        on_delete=models.CASCADE,  # Remove saldo se conta for excluída
        related_name="saldo",  # Nome reverso
        db_index=True,  # Índice
    )

    current_balance = models.DecimalField(
        db_column="current_balance",  # Coluna
        verbose_name="Saldo atual",  # Rótulo
        max_digits=18,  # Dígitos totais
        decimal_places=2,  # Casas decimais
        default=Decimal("0.00"),  # Valor padrão
        validators=[MinValueValidator(Decimal("0.00"))],  # Não permite saldo negativo
    )

    updated_at = models.DateTimeField(
        db_column="updated_at",  # Coluna
        verbose_name="Atualizado em",  # Rótulo
        auto_now=True,  # Atualiza automaticamente
        db_index=True,  # Índice
    )

    class Meta:
        db_table = "contabilidade_saldoconta"  # Nome da tabela
        verbose_name = "Saldo de Conta"  # Nome legível
        verbose_name_plural = "Saldos de Conta"  # Nome plural
        ordering = ["-updated_at"]  # Mais recente primeiro

    def __str__(self) -> str:
        """Mostra id da conta e saldo."""
        return f"{self.account_id}: {self.current_balance}"
