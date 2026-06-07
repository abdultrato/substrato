from datetime import date
from decimal import Decimal

from django.db import models
from django.utils import timezone

from core.models.base import NoNameCoreModel


def add_period(start: date, cycle: str) -> date:
    """Soma um período de cobrança a uma data, tratando fim de mês.

    MENSAL soma 1 mês; ANUAL soma 12 meses. Para datas como 31/01, ajusta
    para o último dia válido do mês de destino (ex.: 28/02).
    """
    months = 12 if cycle == TenantSubscription.BillingCycle.YEARLY else 1
    month_index = (start.month - 1) + months
    year = start.year + month_index // 12
    month = month_index % 12 + 1
    # Último dia do mês de destino
    if month == 12:
        next_month_first = date(year + 1, 1, 1)
    else:
        next_month_first = date(year, month + 1, 1)
    last_day = (next_month_first - timezone.timedelta(days=1)).day
    return date(year, month, min(start.day, last_day))


class TenantSubscription(NoNameCoreModel):
    class Status(models.TextChoices):
        TRIALING = "TRIAL", "Em teste"
        ACTIVE = "ATIVA", "Ativa"
        PAST_DUE = "INADIMPLENTE", "Inadimplente"
        SUSPENDED = "SUSPENSA", "Suspensa"
        CANCELED = "CANCELADA", "Cancelada"

    class BillingCycle(models.TextChoices):
        MONTHLY = "MENSAL", "Mensal"
        YEARLY = "ANUAL", "Anual"

    prefix = "ASS"

    # Estados em que a assinatura ainda gera/recebe cobranças.
    BILLABLE_STATUSES = ("ATIVA", "INADIMPLENTE", "TRIAL")

    tenant = models.ForeignKey(
        "inquilinos.Tenant",
        db_column="tenant_id",
        on_delete=models.CASCADE,
        related_name="assinaturas",
        db_index=True,
    )
    plan = models.ForeignKey(
        "inquilinos.SubscriptionPlan",
        db_column="plan_id",
        on_delete=models.PROTECT,
        related_name="assinaturas",
        db_index=True,
    )

    start_date = models.DateField(
        db_column="start_date",
        default=timezone.localdate, db_index=True)
    end_date = models.DateField(
        db_column="end_date",
        blank=True, null=True)

    status = models.CharField(
        max_length=12,
        choices=Status.choices,
        default=Status.ACTIVE,
        db_index=True,
    )
    cycle = models.CharField(
        db_column="cycle",
        max_length=10,
        choices=BillingCycle.choices,
        default=BillingCycle.MONTHLY,
        db_index=True,
    )

    # ---- Ciclo de vida / cobrança recorrente ----
    current_period_start = models.DateField(
        db_column="current_period_start",
        verbose_name="Início do período atual",
        blank=True, null=True)
    current_period_end = models.DateField(
        db_column="current_period_end",
        verbose_name="Fim do período atual",
        blank=True, null=True, db_index=True)
    next_billing_at = models.DateField(
        db_column="next_billing_at",
        verbose_name="Próxima cobrança",
        blank=True, null=True, db_index=True)
    failed_charges = models.PositiveIntegerField(
        db_column="failed_charges",
        verbose_name="Cobranças falhadas seguidas",
        default=0)
    canceled_at = models.DateTimeField(
        db_column="canceled_at",
        verbose_name="Cancelada em",
        blank=True, null=True)

    class Meta:
        db_table = "inquilinos_assinaturatenant"
        verbose_name = "Assinatura"
        verbose_name_plural = "Assinaturas"
        ordering = ["-start_date"]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["status", "next_billing_at"]),
        ]

    # =========================
    # PREÇO
    # =========================

    def price(self) -> Decimal:
        """Valor do período conforme o ciclo de cobrança."""
        monthly = self.plan.monthly_price if self.plan_id else Decimal("0.00")
        monthly = monthly or Decimal("0.00")
        if self.cycle == self.BillingCycle.YEARLY:
            return (monthly * Decimal("12")).quantize(Decimal("0.01"))
        return Decimal(monthly).quantize(Decimal("0.01"))

    def next_period_bounds(self) -> tuple[date, date]:
        """Limites do próximo período a faturar (após o período atual)."""
        base = self.current_period_end or timezone.localdate()
        return base, add_period(base, self.cycle)

    # =========================
    # TRANSIÇÕES DE CICLO
    # =========================

    def start_first_period(self, start=None, trial_days: int = 0):
        """Inicializa o primeiro período (com ou sem trial)."""
        start = start or timezone.localdate()
        self.start_date = start
        self.current_period_start = start
        if trial_days and trial_days > 0:
            self.status = self.Status.TRIALING
            self.current_period_end = start + timezone.timedelta(days=trial_days)
        else:
            self.status = self.Status.ACTIVE
            self.current_period_end = add_period(start, self.cycle)
        self.next_billing_at = self.current_period_end
        self.failed_charges = 0
        return self

    def advance_period(self):
        """Avança para o próximo período (após cobrança bem-sucedida)."""
        start, end = self.next_period_bounds()
        self.current_period_start = start
        self.current_period_end = end
        self.next_billing_at = end
        self.status = self.Status.ACTIVE
        self.failed_charges = 0

    def is_due(self, today=None) -> bool:
        """Indica se há um período a faturar nesta data."""
        today = today or timezone.localdate()
        if self.status not in self.BILLABLE_STATUSES:
            return False
        if not self.next_billing_at:
            return False
        return self.next_billing_at <= today

    def mark_past_due(self):
        self.status = self.Status.PAST_DUE
        self.save(update_fields=["status", "failed_charges"])

    def suspend(self):
        self.status = self.Status.SUSPENDED
        self.save(update_fields=["status"])

    def activate(self):
        self.status = self.Status.ACTIVE
        self.failed_charges = 0
        self.save(update_fields=["status", "failed_charges"])

    def cancel(self, end_date=None):
        self.status = TenantSubscription.Status.CANCELED
        self.end_date = end_date or timezone.localdate()
        self.canceled_at = timezone.now()
        self.next_billing_at = None
        self.save(update_fields=["status", "end_date", "canceled_at", "next_billing_at"])

    def __str__(self) -> str:
        return f"{self.tenant_id} -> {self.plan_id} ({self.status})"
