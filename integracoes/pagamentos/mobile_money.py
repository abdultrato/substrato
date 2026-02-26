from decimal import Decimal

from frontend.payments.services.gateway import PagamentoGateway


class MobileMoneyGateway(PagamentoGateway):
    """
    Integração base para provedores Mobile Money.

    Adaptável para:
    ✓ M-Pesa
    ✓ mKesh
    ✓ e-Mola
    ✓ outros provedores locais
    """

    def __init__(self, provider_name="mobile_money"):
        self.provider_name = provider_name

    def cobrar(self, valor, referencia, telefone=None, **kwargs):
        """
        Envia solicitação de cobrança ao provedor.

        Em produção, integrar com API do provedor.
        """

        valor = Decimal(valor).quantize(Decimal("0.01"))

        if not telefone:
            return {
                "sucesso": False,
                "mensagem": "Telefone é obrigatório para Mobile Money",
            }

        # Simulação de resposta
        return {
            "sucesso": True,
            "transacao_id": f"{self.provider_name.upper()}-{referencia}",
            "mensagem": f"Solicitação enviada para {telefone}",
        }
