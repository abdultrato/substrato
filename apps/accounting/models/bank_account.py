"""Modelo de conta bancária."""

from decimal import Decimal

from django.db import models

from core.models.base import CoreModel


class BankAccount(CoreModel):
    """Conta bancária da instituição (corrente/poupança)."""

    prefix = "BCO"  # Prefixo para custom_id

    class Kind(models.TextChoices):
        CORRENTE = "COR", "Corrente"
        POUPANCA = "POU", "Poupança"
        OUTRA = "OUT", "Outra"

    bank_name = models.CharField(
        "Banco",
        db_column="bank_name",
        max_length=120,
        db_index=True,
    )
    account_number = models.CharField(
        "Número da conta",
        db_column="account_number",
        max_length=40,
        blank=True,
        default="",
        db_index=True,
    )
    branch = models.CharField(
        "Agência / Balcão",
        db_column="branch",
        max_length=60,
        blank=True,
        default="",
    )
    iban = models.CharField(
        "IBAN / NIB",
        db_column="iban",
        max_length=40,
        blank=True,
        default="",
        db_index=True,
    )
    swift = models.CharField(
        "SWIFT / BIC",
        db_column="swift",
        max_length=20,
        blank=True,
        default="",
    )
    currency = models.CharField(
        "Moeda",
        db_column="currency",
        max_length=3,
        default="MZN",
    )
    holder_name = models.CharField(
        "Titular",
        db_column="holder_name",
        max_length=160,
        blank=True,
        default="",
    )
    kind = models.CharField(
        "Tipo de conta",
        db_column="kind",
        max_length=3,
        choices=Kind.choices,
        default=Kind.CORRENTE,
        db_index=True,
    )
    current_balance = models.DecimalField(
        "Saldo atual",
        db_column="current_balance",
        max_digits=18,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    active = models.BooleanField(
        "Ativa",
        db_column="active",
        default=True,
        db_index=True,
    )
    notes = models.TextField(
        "Observações",
        db_column="notes",
        blank=True,
        default="",
    )
    # Vínculo opcional à conta contábil correspondente (plano de contas).
    account = models.ForeignKey(
        "contabilidade.Account",
        db_column="account_id",
        verbose_name="Conta contábil",
        on_delete=models.SET_NULL,
        related_name="bank_accounts",
        null=True,
        blank=True,
        db_index=True,
    )

    class Meta:
        db_table = "contabilidade_contabancaria"
        verbose_name = "Conta bancária"
        verbose_name_plural = "Contas bancárias"
        ordering = ["bank_name", "name"]
        indexes = [
            models.Index(fields=["tenant", "bank_name"]),
            models.Index(fields=["tenant", "active"]),
        ]

    def __str__(self) -> str:
        ref = self.account_number or self.iban or self.custom_id
        return f"{self.bank_name} - {ref}"
