from servicos.billing_service import BillingService
from aplicativos.inquilinos.modelos.inquilino import Inquilino


def processar_billing():
    for inquilino in Inquilino.objects.ativos():
        BillingService.processar_cobranca_mensal(inquilino)
