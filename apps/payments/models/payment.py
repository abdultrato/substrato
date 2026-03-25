from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models.base import CoreModel
from infrastructure.orm.fields.money_field import MoneyField


class Payment(CoreModel):
    """
    Aggregate Root de Pagamento.

    Responsável por:
    - Estado do pagamento
    - Transições válidas
    - Integração com a fatura
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

    fatura = models.ForeignKey(
        "faturamento.Invoice",
        verbose_name="Fatura",
        on_delete=models.PROTECT,
        related_name="pagamentos",
    )

    valor = MoneyField(verbose_name="Valor")

    metodo = models.CharField(
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

    referencia_externa = models.CharField(
        verbose_name="Referência externa",
        max_length=120,
        blank=True,
        help_text="Referência externa (transação, autorização, etc).",
    )

    seguradora = models.ForeignKey(
        "seguradora.Insurer",
        verbose_name="Seguradora",
        on_delete=models.PROTECT,
        related_name="pagamentos",
        null=True,
        blank=True,
    )

    plano_cobertura = models.ForeignKey(
        "seguradora.CoveragePlan",
        verbose_name="Plano de cobertura",
        on_delete=models.PROTECT,
        related_name="pagamentos",
        null=True,
        blank=True,
    )

    numero_autorizacao = models.CharField(
        verbose_name="Número de autorização",
        max_length=80,
        blank=True,
        default="",
        help_text="Número de autorização do seguro de saúde.",
    )

    dados_seguro = models.JSONField(
        verbose_name="Dados do seguro",
        blank=True,
        default=dict,
        help_text="Dados adicionais do seguro de saúde (ex.: apólice, beneficiário).",
    )

    pago_em = models.DateTimeField(
        verbose_name="Pago em",
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["-criado_em"]
        indexes = [
            models.Index(fields=["fatura"]),
            models.Index(fields=["status"]),
            models.Index(fields=["criado_em"]),
        ]

    def __str__(self):
        return f"{self.get_metodo_display()} - {self.valor} ({self.get_status_display()})"

    def clean(self):
        super().clean()
        if self.metodo != self.Method.SEGURO_SAUDE:
            return

        erros = {}

        if not self.seguradora_id:
            erros["seguradora"] = "Informe a seguradora para pagamentos via seguro de saúde."

        if not (self.numero_autorizacao or "").strip():
            erros["numero_autorizacao"] = "Informe o número de autorização do seguro."

        if self.seguradora_id and self.inquilino_id and self.seguradora.inquilino_id != self.inquilino_id:
            erros["seguradora"] = "Seguradora deve pertencer ao mesmo inquilino."

        if self.plano_cobertura_id:
            if self.inquilino_id and self.plano_cobertura.inquilino_id != self.inquilino_id:
                erros["plano_cobertura"] = "Plano de cobertura deve pertencer ao mesmo inquilino."
            if self.seguradora_id and self.plano_cobertura.seguradora_id != self.seguradora_id:
                erros["plano_cobertura"] = "Plano de cobertura deve pertencer à seguradora selecionada."

        if erros:
            raise ValidationError(erros)

    # =========================
    # TRANSIÇÕES DE ESTADO
    # =========================

    def confirm(self):
        if self.status != self.Status.PENDENTE:
            raise ValidationError("Pagamentos pendentes podem ser confirmados.")

        self.status = self.Status.CONFIRMADO
        if not self.pago_em:
            self.pago_em = timezone.now()
        self.save(update_fields=["status", "pago_em"])
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
        if self.fatura_id:
            self.fatura.atualizar_estado_pagamento(pagamento=payment)


Payment.confirmar = Payment.confirm
Payment._atualizar_fatura = Payment._update_invoice

