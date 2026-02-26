from django.conf import settings

from .mpesa import MpesaGateway
from .emola import EmolaGateway
from .mkesh import MKeshGateway
from .stripe import StripeGateway
from .paypal import PaypalGateway


_GATEWAYS = {
    "mpesa": MpesaGateway,
    "emola": EmolaGateway,
    "mkesh": MKeshGateway,
    "stripe": StripeGateway,
    "paypal": PaypalGateway,
}


def get_gateway(name: str | None = None):
    name = name or getattr(settings, "PAYMENT_GATEWAY", "mpesa")

    if name not in _GATEWAYS:
        raise ValueError(f"Gateway desconhecido: {name}")

    return _GATEWAYS[name]()
