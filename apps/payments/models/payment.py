from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models.base import CoreModel
from infrastructure.orm.fields.money_field import MoneyField


class Payment(CoreModel):
    """
    Aggregate Root de Pagamento.

    Responsável por:
    - Estado do payment
    - Transições válidas
    - Integração com a invoice
    """

    class Method(models.TextChoices):
        DINHEIRO = "DIN", "Dinheiro"
        CARTAO = "CAR", "Cartão"
        TRANSFERENCIA = "TRF", "Transferência"
        MOBILE_MONEY = "MOB", "Mobile Money"
        POS = "POS", "POS"
        CHEQUE = "CHQ", "Cheque"
        SEGURO_SAUDE = "SEG", "Seguro de Saúde"
        OUTRO = "OUT", "Outro"

    Metodo = Method

    class Status(models.TextChoices):
        PENDENTE = "PEN", "Pendente"
        CONFIRMADO = "CON", "Confirmado"
        FALHOU = "FAL", "Falhou"
        ESTORNADO = "EST", "Estornado"
        CANCELADO = "CAN", "Cancelado"

    invoice = models.ForeignKey(

        "faturamento.Invoice",

        db_column="fatura_id",
        verbose_name="Fatura",
        on_delete=models.PROTECT,
        related_name="pagamentos",
    )

    value = MoneyField(

        db_column="valor",

        verbose_name="Valor")

    method = models.CharField(

        db_column="metodo",

        verbose_name="Método",
        max_length=4,
        choices=Method.choices,
    )

    status = models.CharField(
        verbose_name="Estado",
        max_length=3,
        choices=Status.choices,
        default=Status.PENDENTE,
        db_index=True,
    )

    external_reference = models.CharField(

        db_column="referencia_externa",

        verbose_name="Referência externa",
        max_length=120,
        blank=True,
        help_text="Referência externa (transação, autorização, etc).",
    )

    insurer = models.ForeignKey(

        "seguradora.Insurer",

        db_column="seguradora_id",
        verbose_name="Seguradora",
        on_delete=models.PROTECT,
        related_name="pagamentos",
        null=True,
        blank=True,
    )

    coverage_plan = models.ForeignKey(

        "seguradora.CoveragePlan",

        db_column="plano_cobertura_id",
        verbose_name="Plano de cobertura",
        on_delete=models.PROTECT,
        related_name="pagamentos",
        null=True,
        blank=True,
    )

    authorization_number = models.CharField(

        db_column="numero_autorizacao",

        verbose_name="Número de autorização",
        max_length=80,
        blank=True,
        default="",
        help_text="Número de autorização do seguro de saúde.",
    )

    insurance_date = models.JSONField(

        db_column="dados_seguro",

        verbose_name="Dados do seguro",
        blank=True,
        default=dict,
        help_text="Dados adicionais do seguro de saúde (ex.: apólice, beneficiário).",
    )

    paid_at = models.DateTimeField(

        db_column="pago_em",

        verbose_name="Pago em",
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "pagamentos_pagamento"
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
        if self.method != self.Method.SEGURO_SAUDE:
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
        if self.status != self.Status.PENDENTE:
            raise ValidationError("Pagamentos pendentes podem ser confirmados.")

        self.status = self.Status.CONFIRMADO
        if not self.paid_at:
            self.paid_at = timezone.now()
        self.save(update_fields=["status", "paid_at"])
        self._update_invoice(payment=self)

    def falhar(self):
        if self.status != self.Status.PENDENTE:
            raise ValidationError("Pagamentos pendentes podem falhar.")

        self.status = self.Status.FALHOU
        self.save(update_fields=["status"])

    def estornar(self):
        if self.status != self.Status.CONFIRMADO:
            raise ValidationError("Pagamentos confirmados podem ser estornados.")

        self.status = self.Status.ESTORNADO
        self.save(update_fields=["status"])
        self._update_invoice()

    def cancelar(self):
        if self.status != self.Status.PENDENTE:
            raise ValidationError("Pagamentos pendentes podem ser cancelados.")

        self.status = self.Status.CANCELADO
        self.save(update_fields=["status"])

    # =========================
    # INTEGRAÇÃO COM FATURA
    # =========================

    def _update_invoice(self, payment=None):
        if self.invoice_id:
            self.invoice.atualizar_status_payment(payment=payment)


Payment.confirmar = Payment.confirm
Payment._atualizar_invoice = Payment._update_invoice

