from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import (
    Q,
)

from core.constants.accounting.account_type import TipoConta
from core.models.base import CoreModel


class Account(
    CoreModel,
):
    prefix = "CNT"
    # Alias direto para facilitar acesso via Conta.Tipo.*
    Tipo = TipoConta

    type = models.CharField(

        "Tipo de account",

        db_column="tipo",
        max_length=3,
        choices=TipoConta.choices,
        default=TipoConta.DESPESA,
        db_index=True,
    )

    class Meta:
        db_table = "contabilidade_conta"
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
                condition=Q(
                    deleted=False,
                ),
                name="unique_code_account_por_tenant",
            ),
        ]

    # 🔒 Impedir alteração estrutural após uso
    def save(
        self,
        *args,
        **kwargs,
    ):
        if self.pk:
            original = Account.objects.get(
                pk=self.pk,
            )

            if original.type != self.type and self.tem_movimentacao():
                raise ValidationError(
                    "Não é permitido alterar o type de uma account já utilizada.",
                )

        return super().save(
            *args,
            **kwargs,
        )

    # 🔒 Impedir soft-delete se houver saldo ou histórico
    def delete(
        self,
        *args,
        **kwargs,
    ):
        raise ValidationError(
            "Conta não pode ser removida.",
        )

    def tem_movimentacao(
        self,
    ):
        # Verificar LedgerLine se estiver active
        from apps.accounting.models.ledger_line import LedgerLine

        return LedgerLine.objects.filter(
            account_id=self.pk,
        ).exists()

    def __str__(
        self,
    ):
        return f"{self.custom_id} - {self.name}"
