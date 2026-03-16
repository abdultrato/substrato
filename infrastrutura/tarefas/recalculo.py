from aplicativos.inquilinos.modelos.inquilino import Inquilino
from servicos.billing_service import BillingService


def processar_billing():
    for inquilino in Inquilino.objects.ativos():
        BillingService.processar_cobranca_mensal(inquilino)
