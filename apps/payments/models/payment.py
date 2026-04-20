from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
from decimal import Decimal

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

        verbose_name="Valor",
    )

    change_amount = MoneyField(

        db_column="change_amount",

        verbose_name="Troco",
        default=Decimal("0.00"),
    )

    method = models.CharField(

        db_column="method",

        verbose_name="Forma de Pagamento",
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

    def net_value(self) -> Decimal:
        valor = self.value if self.value is not None else Decimal("0.00")
        troco = self.change_amount if self.change_amount is not None else Decimal("0.00")
        return (valor - troco).quantize(Decimal("0.01"))

    def clean(self):
        super().clean()

        erros = {}

        troco = self.change_amount if self.change_amount is not None else Decimal("0.00")
        valor = self.value if self.value is not None else Decimal("0.00")

        if troco < Decimal("0.00"):
            erros["change_amount"] = "Troco não pode ser negativo."

        if self.value is not None and troco > valor:
            erros["change_amount"] = "Troco não pode ser maior que o valor pago."

        if self.method != self.Method.HEALTH_INSURANCE:
            if erros:
                raise ValidationError(erros)
            return

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

        valor_liquido = self.net_value()
        if valor_liquido <= Decimal("0.00"):
            raise ValidationError({"change_amount": "Troco não pode zerar ou negativar o valor líquido."})

        if self.invoice_id:
            total_fatura = (self.invoice.total_a_pagar or Decimal("0.00")).quantize(Decimal("0.01"))
            total_confirmado = (self.invoice.confirmed_paid_amount() or Decimal("0.00")).quantize(Decimal("0.01"))
            restante = (total_fatura - total_confirmado).quantize(Decimal("0.01"))

            if restante <= Decimal("0.00"):
                raise ValidationError({"invoice": "Fatura já está totalmente quitada."})

            if valor_liquido > restante:
                troco_atual = self.change_amount if self.change_amount is not None else Decimal("0.00")
                troco_minimo = (troco_atual + (valor_liquido - restante)).quantize(Decimal("0.01"))
                raise ValidationError(
                    {
                        "change_amount": (
                            "Troco insuficiente para manter o total líquido igual ao valor da fatura. "
                            f"Informe no mínimo {troco_minimo:.2f}."
                        )
                    }
                )

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
