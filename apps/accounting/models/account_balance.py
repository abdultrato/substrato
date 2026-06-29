"""Snapshot materializado de saldo de conta."""

from decimal import Decimal  # Para valores monetários

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
        # Saldo pode ser negativo (ex.: passivos, contrapartidas) — sem MinValue.
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


def recompute_account_balance(account):
    """Recalcula o saldo da conta a partir dos movimentos confirmados.

    Convenção de partida dobrada:
      - Contas de natureza devedora (Ativo, Despesa): saldo = débitos − créditos.
      - Contas de natureza credora (Passivo, Receita, Patrimônio): saldo = créditos − débitos.

    Considera apenas movimentos cujo lançamento esteja confirmado.
    """
    from django.db.models import Sum

    from core.constants.accounting.account_type import AccountType
    from apps.accounting.models.legacy_movement import LegacyMovement

    agg = (
        LegacyMovement.objects.filter(account=account, entry__confirmed=True)
        .aggregate(total_debit=Sum("debit"), total_credit=Sum("credit"))
    )
    total_debit = agg["total_debit"] or Decimal("0.00")
    total_credit = agg["total_credit"] or Decimal("0.00")

    credit_normal = account.type in {
        AccountType.PASSIVO,
        AccountType.RECEITA,
        AccountType.PATRIMONIO,
    }
    balance = (total_credit - total_debit) if credit_normal else (total_debit - total_credit)

    AccountBalance.objects.update_or_create(
        account=account,
        defaults={"current_balance": balance},
    )

    # Sincroniza contas bancárias vinculadas a esta conta contábil.
    from apps.accounting.models.bank_account import BankAccount

    BankAccount.objects.filter(account=account).update(current_balance=balance)

    return balance
