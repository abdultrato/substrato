from django.utils import timezone

from infrastructure.cache import TenantCache


class TenantUsageService:
    """
    Controle de uso mensal por tenant.
    """

    KEY_PREFIX = "requests"
    TTL_DAYS = 40  # mantém histórico curto pós-fechamento

    # =====================================================
    # CHAVE
    # =====================================================

    @staticmethod
    def _month_reference(date=None):
        if date is None:
            date = timezone.now()
        return date.strftime("%Y-%m")

    @staticmethod
    def _key(periodo: str):
        return f"{TenantUsageService.KEY_PREFIX}:{periodo}"

    # =====================================================
    # INCREMENTO
    # =====================================================

    @staticmethod
    def incrementar_requisicao(inquilino):
        """
        Incrementa o contador mensal do tenant.
        """
        periodo = TenantUsageService._month_reference()
        key = TenantUsageService._key(periodo)

        return TenantCache.incr(
            inquilino.id,
            key,
            amount=1,
            timeout=60 * 60 * 24 * TenantUsageService.TTL_DAYS,
        )

    # =====================================================
    # CONSULTA
    # =====================================================

    @staticmethod
    def obter_requisicoes(inquilino, periodo=None):
        """
        Retorna a contagem do mês atual ou do período informado.
        """
        periodo = periodo or TenantUsageService._month_reference()
        key = TenantUsageService._key(periodo)

        return TenantCache.get(inquilino.id, key) or 0

    # =====================================================
    # RESET
    # =====================================================

    @staticmethod
    def resetar_requisicoes(inquilino, periodo=None):
        periodo = periodo or TenantUsageService._month_reference()
        key = TenantUsageService._key(periodo)

        TenantCache.set(inquilino.id, key, 0)

    # =====================================================
    # MÉTRICAS AUXILIARES
    # =====================================================

    @staticmethod
    def percentual_uso(inquilino):
        uso = TenantUsageService.obter_requisicoes(inquilino)
        limite = inquilino.plano.limite_requisicoes_mes or 0

        if not limite:
            return 0

        return round((uso / limite) * 100, 2)
