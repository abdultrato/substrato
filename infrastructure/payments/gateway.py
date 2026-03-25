from decimal import Decimal


class PaymentGateway:
    """
    Interface base para integração com provedores externos
    (Mobile Money, POS, bancos, gateways online).
    """

    def cobrar(self, value, referencia, **kwargs):
        """
        Realisa uma cobrança no provedor externo.

        Deve retornar:
        {
            "sucesso": bool,
            "transaction_id": str,
            "message": str,
        }
        """
        raise NotImplementedError


class SimulatedGateway(PaymentGateway):
    """
    Gateway de teste para desenvolvimento.
    """

    def cobrar(self, value, referencia, **kwargs):
        value = Decimal(value).quantize(Decimal("0.01"))

        return {
            "sucesso": True,
            "transaction_id": f"SIM-{referencia}",
            "message": f"Pagamento simulado aprovado ({value})",
        }


def process_payment_gateway(payment, gateway: PaymentGateway):
    """
    Processa payment usando gateway externo.
    """

    response = gateway.cobrar(
        value=payment.value,
        referencia=payment.custom_id,
    )

    if response.get("sucesso"):
        payment.referencia = response.get("transaction_id", "")
        payment.confirmed = True
        payment.save(update_fields=["referencia", "confirmed", "updated_at"])
    else:
        payment.confirmed = False
        payment.save(update_fields=["confirmed", "updated_at"])

    return response


PagamentoGateway = PaymentGateway
GatewaySimulado = SimulatedGateway
processar_payment_gateway = process_payment_gateway
