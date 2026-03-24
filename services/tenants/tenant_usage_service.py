from django.utils import timezone

from infrastructure.cache import TenantCache


class TenantUsageService:
    """
    Controls monthly tenant request usage.
    """

    KEY_PREFIX = "requests"
    TTL_DAYS = 40

    @staticmethod
    def _month_reference(date=None):
        if date is None:
            date = timezone.now()
        return date.strftime("%Y-%m")

    @staticmethod
    def _cache_key(period: str):
        return f"{TenantUsageService.KEY_PREFIX}:{period}"

    @staticmethod
    def increment_request(tenant):
        period = TenantUsageService._month_reference()
        key = TenantUsageService._cache_key(period)

        return TenantCache.incr(
            tenant.id,
            key,
            amount=1,
            timeout=60 * 60 * 24 * TenantUsageService.TTL_DAYS,
        )

    @staticmethod
    def get_requests(tenant, period=None):
        period = period or TenantUsageService._month_reference()
        key = TenantUsageService._cache_key(period)

        return TenantCache.get(tenant.id, key) or 0

    @staticmethod
    def reset_requests(tenant, period=None):
        period = period or TenantUsageService._month_reference()
        key = TenantUsageService._cache_key(period)

        TenantCache.set(tenant.id, key, 0)

    @staticmethod
    def usage_percentage(tenant):
        usage = TenantUsageService.get_requests(tenant)
        plan = getattr(tenant, "plan", None)
        limit = getattr(plan, "limite_requisicoes_mes", 0) or 0

        if not limit:
            return 0

        return round((usage / limit) * 100, 2)


TenantUsageService._key = TenantUsageService._cache_key
TenantUsageService.incrementar_requisicao = TenantUsageService.increment_request
TenantUsageService.obter_requisicoes = TenantUsageService.get_requests
TenantUsageService.resetar_requisicoes = TenantUsageService.reset_requests
TenantUsageService.percentual_uso = TenantUsageService.usage_percentage
