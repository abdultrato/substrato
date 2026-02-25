from django.conf import settings


class PaymentGateway:
    """
    Interface base para gateways de pagamento.
    """

    name = "base"

    def charge(self, amount: float, reference: str, phone: str | None = None):
        raise NotImplementedError

    def status(self, transaction_id: str):
        raise NotImplementedError

    def refund(self, transaction_id: str, amount: float | None = None):
        raise NotImplementedError


def get_gateway(name: str | None = None) -> PaymentGateway:
    """
    Retorna gateway configurado.
    """

    name = name or getattr(settings, "PAYMENT_GATEWAY", "mpesa")

    gateways = {
        "mpesa": "viewsets.integrations.payments.mpesa.MpesaGateway",
        "emola": "viewsets.integrations.payments.emola.EmolaGateway",
        "mkesh": "viewsets.integrations.payments.mkesh.MKeshGateway",
        "stripe": "viewsets.integrations.payments.stripe.StripeGateway",
        "paypal": "viewsets.integrations.payments.paypal.PaypalGateway",
    }

    if name not in gateways:
        raise ValueError(f"Gateway desconhecido: {name}")

    module_path, class_name = gateways[name].rsplit(".", 1)

    module = __import__(module_path, fromlist=[class_name])
    return getattr(module, class_name)()
