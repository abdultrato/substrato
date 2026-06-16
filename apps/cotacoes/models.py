"""Modelos do módulo de Cotação (documento comercial não fiscal).

A cotação é uma proposta comercial genérica, transversal aos setores, com ciclo
de vida próprio (rascunho → enviada → aceite → convertida) e conversão para uma
fatura (``faturamento.Invoice``) em rascunho. Não é documento fiscal e não
confirma pagamento — ver regra central no roteiro do módulo.
"""

from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from configuration.utils.django_compat import check_constraint
from core.mixins.model.position import ScopedPositionMixin
from core.models.base import NoNameCoreModel

ZERO = Decimal("0.00")


class Quotation(NoNameCoreModel):
    """Cotação comercial: proposta com itens, sinal e ciclo de vida próprio."""

    prefix = "COT"

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Rascunho"
        SENT = "SENT", "Enviada"
        ACCEPTED = "ACCEPTED", "Aceite"
        REJECTED = "REJECTED", "Rejeitada"
        EXPIRED = "EXPIRED", "Expirada"
        CONVERTED = "CONVERTED", "Convertida"
        CANCELLED = "CANCELLED", "Cancelada"

    class DepositType(models.TextChoices):
        NONE = "NONE", "Sem sinal"
        PERCENTAGE = "PERCENTAGE", "Percentagem"
        FIXED = "FIXED", "Valor fixo"

    # Estados em que os valores principais ficam bloqueados para edição (§24).
    LOCKED_STATUSES = frozenset({Status.ACCEPTED, Status.CONVERTED, Status.CANCELLED})

    quotation_number = models.CharField(
        "Número da cotação",
        max_length=30,
        blank=True,
        default="",
        db_index=True,
        help_text="Sequência por tenant/ano (COT-AAAA-NNNNNN); atribuída ao enviar.",
    )

    # ── Cliente (espelha a Invoice): entidade fiscal e/ou paciente.
    fiscal_client = models.ForeignKey(
        "entidades.Company",
        db_column="fiscal_client_id",
        verbose_name="Cliente (entidade)",
        on_delete=models.PROTECT,
        related_name="quotations",
        null=True,
        blank=True,
        db_index=True,
    )
    fiscal_client_name = models.CharField("Cliente (nome)", max_length=200, blank=True, default="")
    fiscal_client_nuit = models.CharField("Cliente (NUIT)", max_length=30, blank=True, default="")
    fiscal_client_address = models.TextField("Cliente (morada)", blank=True, default="")
    patient = models.ForeignKey(
        "clinical.Patient",
        db_column="patient_id",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="quotations",
        null=True,
        blank=True,
        db_index=True,
    )

    status = models.CharField(
        "Estado",
        max_length=12,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )

    issue_date = models.DateField("Data de emissão", null=True, blank=True, db_index=True)
    expiry_date = models.DateField("Data de validade", null=True, blank=True, db_index=True)

    currency = models.CharField("Moeda", max_length=3, default="MZN")
    exchange_rate = models.DecimalField(
        "Taxa de câmbio",
        max_digits=12,
        decimal_places=6,
        default=Decimal("1.000000"),
        validators=[MinValueValidator(ZERO)],
    )

    subtotal = models.DecimalField("Subtotal", max_digits=12, decimal_places=2, default=ZERO)
    discount_total = models.DecimalField("Total de descontos", max_digits=12, decimal_places=2, default=ZERO)
    tax_total = models.DecimalField("Total de impostos", max_digits=12, decimal_places=2, default=ZERO)
    grand_total = models.DecimalField("Total geral", max_digits=12, decimal_places=2, default=ZERO)

    deposit_type = models.CharField(
        "Tipo de sinal",
        max_length=12,
        choices=DepositType.choices,
        default=DepositType.NONE,
    )
    deposit_percentage = models.DecimalField(
        "Sinal (%)",
        max_digits=5,
        decimal_places=2,
        default=ZERO,
        validators=[MinValueValidator(ZERO), MaxValueValidator(Decimal("100.00"))],
    )
    deposit_fixed_amount = models.DecimalField(
        "Sinal (valor fixo definido)",
        max_digits=12,
        decimal_places=2,
        default=ZERO,
        validators=[MinValueValidator(ZERO)],
        help_text="Valor de sinal pretendido quando o tipo é 'Valor fixo'.",
    )
    deposit_required = models.DecimalField("Valor do sinal", max_digits=12, decimal_places=2, default=ZERO)
    balance_due = models.DecimalField("Saldo previsto", max_digits=12, decimal_places=2, default=ZERO)

    notes = models.TextField("Observações", blank=True, default="")
    terms_and_conditions = models.TextField("Termos e condições", blank=True, default="")

    sent_at = models.DateTimeField("Enviada em", null=True, blank=True)
    accepted_at = models.DateTimeField("Aceite em", null=True, blank=True)
    rejected_at = models.DateTimeField("Rejeitada em", null=True, blank=True)
    converted_at = models.DateTimeField("Convertida em", null=True, blank=True)
    rejection_reason = models.TextField("Motivo da rejeição", blank=True, default="")

    converted_invoice = models.ForeignKey(
        "faturamento.Invoice",
        db_column="converted_invoice_id",
        verbose_name="Fatura gerada",
        on_delete=models.SET_NULL,
        related_name="source_quotations",
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "cotacoes_cotacao"
        verbose_name = "Cotação"
        verbose_name_plural = "Cotações"
        ordering = ["-issue_date", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "quotation_number"],
                condition=models.Q(deleted=False) & ~models.Q(quotation_number=""),
                name="unique_quotation_number_por_tenant",
            ),
            check_constraint(
                condition=models.Q(deposit_percentage__gte=0) & models.Q(deposit_percentage__lte=100),
                name="cotacao_deposit_percentage_0_100",
            ),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "fiscal_client", "status"]),
            models.Index(fields=["tenant", "expiry_date"]),
        ]

    def clean(self):
        super().clean()
        if self.issue_date and self.expiry_date and self.expiry_date < self.issue_date:
            raise ValidationError({"expiry_date": "A validade não pode ser anterior à data de emissão."})
        if self.deposit_type == self.DepositType.PERCENTAGE and not (ZERO <= self.deposit_percentage <= Decimal("100.00")):
            raise ValidationError({"deposit_percentage": "A percentagem do sinal deve estar entre 0 e 100."})
        if self.deposit_required and self.grand_total and self.deposit_required > self.grand_total:
            raise ValidationError({"deposit_required": "O valor do sinal não pode ultrapassar o total."})
        if self.patient_id and self.fiscal_client_id is None and not self.fiscal_client_name:
            # Paciente como cliente: preenche nome a partir do paciente para o documento.
            self.fiscal_client_name = getattr(self.patient, "name", "") or self.fiscal_client_name

    @property
    def is_locked(self) -> bool:
        return self.status in self.LOCKED_STATUSES

    def __str__(self) -> str:
        return self.quotation_number or self.custom_id or f"Cotação {self.pk}"


class QuotationItem(ScopedPositionMixin, NoNameCoreModel):
    """Linha de cotação (serviço, produto ou outro)."""

    prefix = "COTI"

    position_scope_fields = ("quotation",)

    class ItemType(models.TextChoices):
        SERVICE = "SERVICE", "Serviço"
        PRODUCT = "PRODUCT", "Produto"
        OTHER = "OTHER", "Outro"

    quotation = models.ForeignKey(
        "cotacoes.Quotation",
        db_column="quotation_id",
        verbose_name="Cotação",
        on_delete=models.CASCADE,
        related_name="items",
    )
    item_type = models.CharField(
        "Tipo de item",
        max_length=12,
        choices=ItemType.choices,
        default=ItemType.SERVICE,
        db_index=True,
    )
    description = models.CharField("Descrição", max_length=255)
    quantity = models.DecimalField(
        "Quantidade",
        max_digits=10,
        decimal_places=2,
        default=Decimal("1.00"),
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    unit_price = models.DecimalField(
        "Preço unitário",
        max_digits=12,
        decimal_places=2,
        default=ZERO,
        validators=[MinValueValidator(ZERO)],
    )
    discount_rate = models.DecimalField(
        "Desconto (%)",
        max_digits=5,
        decimal_places=2,
        default=ZERO,
        validators=[MinValueValidator(ZERO), MaxValueValidator(Decimal("100.00"))],
    )
    discount_amount = models.DecimalField("Valor do desconto", max_digits=12, decimal_places=2, default=ZERO)
    tax_rate = models.DecimalField(
        "Imposto (%)",
        max_digits=5,
        decimal_places=2,
        default=ZERO,
        validators=[MinValueValidator(ZERO), MaxValueValidator(Decimal("100.00"))],
    )
    tax_amount = models.DecimalField("Valor do imposto", max_digits=12, decimal_places=2, default=ZERO)
    line_total = models.DecimalField("Total da linha", max_digits=12, decimal_places=2, default=ZERO)

    class Meta:
        db_table = "cotacoes_item"
        verbose_name = "Item de Cotação"
        verbose_name_plural = "Itens de Cotação"
        ordering = ["quotation", "position", "id"]

    @property
    def gross(self) -> Decimal:
        """Bruto antes de desconto/imposto."""
        return (self.unit_price or ZERO) * (self.quantity or ZERO)

    def compute_amounts(self) -> None:
        """Calcula desconto, imposto e total da linha (base = bruto - desconto)."""
        gross = self.gross
        if self.discount_rate:
            self.discount_amount = (gross * (self.discount_rate / Decimal("100"))).quantize(Decimal("0.01"))
        base = gross - (self.discount_amount or ZERO)
        if base < ZERO:
            base = ZERO
        self.tax_amount = (base * (self.tax_rate / Decimal("100"))).quantize(Decimal("0.01")) if self.tax_rate else ZERO
        self.line_total = (base + self.tax_amount).quantize(Decimal("0.01"))

    def clean(self):
        super().clean()
        if self.quantity is not None and self.quantity <= 0:
            raise ValidationError({"quantity": "A quantidade deve ser maior que zero."})
        if self.unit_price is not None and self.unit_price < ZERO:
            raise ValidationError({"unit_price": "O preço unitário não pode ser negativo."})

    def save(self, *args, **kwargs):
        if not self.tenant_id and self.quotation_id:
            self.tenant_id = self.quotation.tenant_id
        self.compute_amounts()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.description or f"Item {self.pk}"


class QuotationStatusHistory(NoNameCoreModel):
    """Trilha de transições de estado e eventos da cotação (§25/§26)."""

    prefix = "COTH"

    quotation = models.ForeignKey(
        "cotacoes.Quotation",
        db_column="quotation_id",
        verbose_name="Cotação",
        on_delete=models.CASCADE,
        related_name="status_history",
    )
    from_status = models.CharField("De", max_length=12, blank=True, default="")
    to_status = models.CharField("Para", max_length=12, blank=True, default="")
    event_type = models.CharField("Evento", max_length=40, db_index=True)
    actor_name = models.CharField("Autor", max_length=160, blank=True, default="")
    summary = models.CharField("Resumo", max_length=255, blank=True, default="")
    metadata = models.JSONField("Metadados", default=dict, blank=True)
    event_at = models.DateTimeField("Ocorrido em", db_index=True)

    class Meta:
        db_table = "cotacoes_historico_estado"
        verbose_name = "Histórico de Cotação"
        verbose_name_plural = "Históricos de Cotação"
        ordering = ["-event_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "quotation", "event_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.event_type} ({self.quotation_id})"
