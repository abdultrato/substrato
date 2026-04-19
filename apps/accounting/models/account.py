"""Modelo de conta contábil."""

from django.core.exceptions import ValidationError  # Para regras de domínio
from django.db import models  # ORM
from django.db.models import Q  # Filtros condicionais em constraints

from core.constants.accounting.account_type import TipoConta  # Enum de tipos de conta
from core.models.base import CoreModel  # Modelo base com campos comuns


class Account(CoreModel):
    """Conta contábil usada nos lançamentos."""

    prefix = "CNT"  # Prefixo para IDs amigáveis
    # Alias direto para facilitar acesso via Conta.Tipo.*
    Tipo = TipoConta

    type = models.CharField(
        "Tipo de account",  # Rótulo traduzido
        db_column="type",  # Nome da coluna
        max_length=3,  # Tamanho do código
        choices=TipoConta.choices,  # Limita aos tipos válidos
        default=TipoConta.DESPESA,  # Valor padrão
        db_index=True,  # Índice para filtros
    )

    class Meta:
        db_table = "contabilidade_conta"  # Nome da tabela
        verbose_name = "Conta contábil"  # Nome legível
        verbose_name_plural = "Contas contábeis"  # Nome plural
        indexes = [
            models.Index(
                fields=[
                    "tenant",
                    "custom_id",
                ],
            ),
            models.Index(
                fields=[
                    "tenant",
                    "type",
                ],
            ),
        ]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "tenant",
                    "custom_id",
                ],
                condition=Q(deleted=False),  # Garante código único para contas ativas
                name="unique_code_account_por_tenant",
            ),
        ]

    # 🔒 Impedir alteração estrutural após uso
    def save(self, *args, **kwargs):
        """Bloqueia mudança de tipo depois que a conta possui movimentação."""
        if self.pk:
            original = Account.objects.get(pk=self.pk)

            if original.type != self.type and self.tem_movimentacao():
                raise ValidationError("Não é permitido alterar o type de uma account já utilizada.")

        return super().save(*args, **kwargs)

    # 🔒 Impedir soft-delete se houver saldo ou histórico
    def delete(self, *args, **kwargs):
        """Conta não pode ser removida (mantém histórico)."""
        raise ValidationError("Conta não pode ser removida.")

    def tem_movimentacao(self):
        """Verifica se já existe alguma linha contábil para esta conta."""
        # Verificar LedgerLine se estiver active
        from apps.accounting.models.ledger_line import LedgerLine

        return LedgerLine.objects.filter(account_id=self.pk).exists()

    def __str__(self):
        """Representação legível da conta."""
        return f"{self.custom_id} - {self.name}"
