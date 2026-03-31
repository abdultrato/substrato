from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models.base import CoreModel
from infrastructure.orm.fields.money_field import MoneyField


class Payment(CoreModel):
    """Aggregate root de pagamento (estado, transições e vínculo à fatura)."""

    class Method(models.TextChoices):
        CASH = "DIN", "Dinheiro"
        CARD = "CAR", "Cartão"
        TRANSFER = "TRF", "Transferência"
        MOBILE_MONEY = "MOB", "Mobile Money"
        POS = "POS", "POS"
        CHECK = "CHQ", "Cheque"
        HEALTH_INSURANCE = "SEG", "Seguro de Saúde"
        OTHER = "OUT", "Outro"

    class Status(models.TextChoices):
        PENDING = "PEN", "Pendente"
        CONFIRMED = "CON", "Confirmado"
        FAILED = "FAL", "Falhou"
        REFUNDED = "EST", "Estornado"
        CANCELED = "CAN", "Cancelado"

    invoice = models.ForeignKey(

        "faturamento.Invoice",

        db_column="invoice_id",
        verbose_name="Fatura",
        on_delete=models.PROTECT,
        related_name="pagamentos",
    )

    value = MoneyField(

        db_column="value",

        verbose_name="Valor")

    method = models.CharField(

        db_column="method",

        verbose_name="Método",
        max_length=4,
        choices=Method.choices,
    )

    status = models.CharField(
        verbose_name="Estado",
        max_length=3,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )

    external_reference = models.CharField(

        db_column="external_reference",

        verbose_name="Referência externa",
        max_length=120,
        blank=True,
        help_text="Referência externa (transação, autorização, etc).",
    )

    insurer = models.ForeignKey(

        "seguradora.Insurer",

        db_column="insurer_id",
        verbose_name="Seguradora",
        on_delete=models.PROTECT,
        related_name="pagamentos",
        null=True,
        blank=True,
    )

    coverage_plan = models.ForeignKey(

        "seguradora.CoveragePlan",

        db_column="coverage_plan_id",
        verbose_name="Plano de cobertura",
        on_delete=models.PROTECT,
        related_name="pagamentos",
        null=True,
        blank=True,
    )

    authorization_number = models.CharField(

        db_column="authorization_number",

        verbose_name="Número de autorização",
        max_length=80,
        blank=True,
        default="",
        help_text="Número de autorização do seguro de saúde.",
    )

    insurance_date = models.JSONField(

        db_column="insurance_date",

        verbose_name="Dados do seguro",
        blank=True,
        default=dict,
        help_text="Dados adicionais do seguro de saúde (ex.: apólice, beneficiário).",
    )

    paid_at = models.DateTimeField(

        db_column="paid_at",

        verbose_name="Pago em",
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "pagamentos_pagamento"
        verbose_name = "Pagamento"
        verbose_name_plural = "Pagamentos"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["invoice"]),
            models.Index(fields=["status"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"{self.get_method_display()} - {self.value} ({self.get_status_display()})"

    def clean(self):
        super().clean()
        if self.method != self.Method.HEALTH_INSURANCE:
            return

        erros = {}

        if not self.insurer_id:
            erros["insurer"] = "Informe a insurer para pagamentos via seguro de saúde."

        if not (self.authorization_number or "").strip():
            erros["authorization_number"] = "Informe o número de autorização do seguro."

        if self.insurer_id and self.tenant_id and self.insurer.tenant_id != self.tenant_id:
            erros["insurer"] = "Seguradora deve pertencer ao mesmo tenant."

        if self.coverage_plan_id:
            if self.tenant_id and self.coverage_plan.tenant_id != self.tenant_id:
                erros["coverage_plan"] = "Plano de cobertura deve pertencer ao mesmo tenant."
            if self.insurer_id and self.coverage_plan.insurer_id != self.insurer_id:
                erros["coverage_plan"] = "Plano de cobertura deve pertencer à insurer selecionada."

        if erros:
            raise ValidationError(erros)

    # =========================
    # TRANSIÇÕES DE ESTADO
    # =========================

    def confirm(self):
        if self.status != self.Status.PENDING:
            raise ValidationError("Pagamentos pendentes podem ser confirmados.")

        self.status = self.Status.CONFIRMED
        if not self.paid_at:
            self.paid_at = timezone.now()
        self.save(update_fields=["status", "paid_at"])
        self._update_invoice(payment=self)

    def fail(self):
        if self.status != self.Status.PENDING:
            raise ValidationError("Pagamentos pendentes podem falhar.")

        self.status = self.Status.FAILED
        self.save(update_fields=["status"])

    def refund(self):
        if self.status != self.Status.CONFIRMED:
            raise ValidationError("Pagamentos confirmados podem ser estornados.")

        self.status = self.Status.REFUNDED
        self.save(update_fields=["status"])
        self._update_invoice()

    def cancel(self):
        if self.status != self.Status.PENDING:
            raise ValidationError("Pagamentos pendentes podem ser cancelados.")

        self.status = self.Status.CANCELED
        self.save(update_fields=["status"])

    # =========================
    # INTEGRAÇÃO COM FATURA
    # =========================

    def _update_invoice(self, payment=None):
        if self.invoice_id:
            self.invoice.update_payment_status(payment=payment)

