from decimal import Decimal


class PaymentGateway:
    """
    Interface base para integração com provedores externos
    (Mobile Money, POS, bancos, gateways online).
    """

    def charge(self, value, reference, **kwargs):
        """
        Realiza uma cobrança no provedor externo.

        Deve retornar:
        {
            "success": bool,
            "transaction_id": str,
            "message": str,
        }
        """
        raise NotImplementedError


class SimulatedGateway(PaymentGateway):
    """
    Gateway de teste para desenvolvimento.
    """

    def charge(self, value, reference, **kwargs):
        value = Decimal(value).quantize(Decimal("0.01"))

        return {
            "success": True,
            "transaction_id": f"SIM-{reference}",
            "message": f"Pagamento simulado aprovado ({value})",
        }


def process_payment_gateway(payment, gateway: PaymentGateway):
    """
    Processa payment usando gateway externo.
    """

    response = gateway.charge(
        value=payment.value,
        reference=payment.custom_id,
    )

    if response.get("success"):
        payment.external_reference = response.get("transaction_id", "") or ""
        payment.save(update_fields=["external_reference", "updated_at"])
        payment.confirm()
    else:
        payment.fail()

    return response
