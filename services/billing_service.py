"""Serviço central de cobrança recorrente e excedentes por tenant."""

from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from django_redis import get_redis_connection

from application.payments.start_payment import execute as charge_payment
from infrastructure.cache import TenantCache
from services.tenants.tenant_usage_service import TenantUsageService


class BillingService:
    """
    Processa cobranças de excedente do tenant por período de faturamento.
    """

    EXTRA_REQUEST_UNIT_PRICE = Decimal("2.00")
    LOCK_TIMEOUT = 60
    CACHE_TTL_SECONDS = 60 * 60 * 24 * 40

    @staticmethod
    def process_monthly_charge(tenant):
        if not tenant or not tenant.active:
            return None

        plan = getattr(tenant, "plan", None)
        if not plan or not plan.active:
            return None

        period = BillingService._current_period()
        lock_key = f"billing:{tenant.id}:{period}"
        redis = get_redis_connection("default")

        if not redis.set(lock_key, "1", nx=True, ex=BillingService.LOCK_TIMEOUT):
            return None

        try:
            return BillingService._process_charge(tenant, period)
        finally:
            redis.delete(lock_key)

    @staticmethod
    @transaction.atomic
    def _process_charge(tenant, period):
        if TenantCache.get(tenant.id, f"billing_done:{period}"):
            return None

        usage = TenantUsageService.get_requests(tenant) or 0
        plan = getattr(tenant, "plan", None)
        limit = getattr(plan, "monthly_request_limit", 0) or 0

        if usage <= limit:
            TenantCache.set(
                tenant.id,
                f"billing_done:{period}",
                True,
                timeout=BillingService.CACHE_TTL_SECONDS,
            )
            return None

        excess_requests = usage - limit
        extra_value = BillingService._calculate_extra_value(tenant, excess_requests)

        charge_payment(
            value=extra_value,
            reference=f"TENANT-BILLING-{tenant.id}-{period}",
        )

        TenantCache.set(
            tenant.id,
            f"billing_done:{period}",
            True,
            timeout=BillingService.CACHE_TTL_SECONDS,
        )
        TenantUsageService.reset_requests(tenant)
        return extra_value

    @staticmethod
    def _calculate_extra_value(tenant, excess_requests: int) -> Decimal:
        plan = getattr(tenant, "plan", None)
        unit_price = getattr(plan, "request_overage_price", None) or BillingService.EXTRA_REQUEST_UNIT_PRICE
        return Decimal(excess_requests) * Decimal(unit_price)

    @staticmethod
    def _current_period():
        today = timezone.now().date()
        return today.strftime("%Y-%m")

