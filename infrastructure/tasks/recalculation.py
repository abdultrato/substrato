from apps.tenants.models.tenant import Tenant
from services.billing_service import BillingService


def process_billing():
    for tenant in Tenant.objects.ativos():
        BillingService.processar_cobranca_mensal(tenant)


processar_billing = process_billing
