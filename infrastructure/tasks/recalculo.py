from apps.tenants.models.tenant import Tenant
from services.billing_service import BillingService


def processar_billing():
    for inquilino in Tenant.objects.ativos():
        BillingService.processar_cobranca_mensal(inquilino)
