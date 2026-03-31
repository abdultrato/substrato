"""Tarefa utilitária para recalcular cobrança mensal de todos os tenants ativos."""

from apps.tenants.models.tenant import Tenant
from services.billing_service import BillingService


def process_billing():
    """Itera sobre tenants ativos e aciona cobrança mensal."""
    for tenant in Tenant.objects.ativos():
        BillingService.processar_cobranca_mensal(tenant)


processar_billing = process_billing
