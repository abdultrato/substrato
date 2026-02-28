from datetime import date
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from django_redis import get_redis_connection

from servicos.tenant_usage_service import TenantUsageService
from aplicacao.pagamentos.iniciar_pagamento import iniciar_pagamento
from infrastrutura.cache import TenantCache


class BillingService:
    """
    Serviço de cobrança multi-tenant.

    ✔ Idempotente
    ✔ Seguro sob concorrência
    ✔ Mensal
    ✔ Preparado para task scheduler
    """

    EXCEDENTE_PRECO_UNITARIO = Decimal("2.00")  # MZN por requisição
    LOCK_TIMEOUT = 60  # segundos

    @staticmethod
    def processar_cobranca_mensal(inquilino):
        """
        Processa cobrança do mês atual.
        """

        if not inquilino or not inquilino.ativo:
            return

        if not inquilino.plano or not inquilino.plano.ativo:
            return

        periodo = BillingService._periodo_atual()
        lock_key = f"billing:{inquilino.id}:{periodo}"

        redis = get_redis_connection("default")

        # Lock distribuído (evita cobrança duplicada)
        if not redis.set(lock_key, "1", nx=True, ex=BillingService.LOCK_TIMEOUT):
            return

        try:
            return BillingService._processar(inquilino, periodo)
        finally:
            redis.delete(lock_key)

    # =====================================================
    # PROCESSAMENTO INTERNO
    # =====================================================

    @staticmethod
    @transaction.atomic
    def _processar(inquilino, periodo):

        # Idempotência via cache
        if TenantCache.get(inquilino.id, f"billing_done:{periodo}"):
            return

        uso = TenantUsageService.obter_requisicoes(inquilino) or 0
        limite = inquilino.plano.limite_requisicoes_mes or 0

        if uso <= limite:
            TenantCache.set(
                inquilino.id,
                f"billing_done:{periodo}",
                True,
                timeout=60 * 60 * 24 * 40,  # 40 dias
            )
            return

        excedente = uso - limite
        valor_extra = BillingService._calcular_valor_excedente(excedente)

        iniciar_pagamento(
            inquilino=inquilino,
            valor=valor_extra,
            descricao=f"Excedente de requisições - {periodo}",
        )

        # Marca como processado
        TenantCache.set(
            inquilino.id,
            f"billing_done:{periodo}",
            True,
            timeout=60 * 60 * 24 * 40,
        )

        # Reset contador mensal
        TenantUsageService.resetar_requisicoes(inquilino)

        return valor_extra

    # =====================================================
    # CÁLCULO
    # =====================================================

    @staticmethod
    def _calcular_valor_excedente(excedente: int) -> Decimal:
        return Decimal(excedente) * BillingService.EXCEDENTE_PRECO_UNITARIO

    # =====================================================
    # PERÍODO
    # =====================================================

    @staticmethod
    def _periodo_atual():
        hoje = timezone.now().date()
        return hoje.strftime("%Y-%m")
