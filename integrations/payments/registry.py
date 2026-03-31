"""Registro dinâmico de gateways de pagamento suportados."""

from importlib import import_module

from django.conf import settings

_GATEWAY_IMPORTS = {
    "mpesa": ("integrations.payments.mpesa", "MpesaGateway"),
    "emola": ("integrations.payments.emola", "EmolaGateway"),
    "mkesh": ("integrations.payments.mkesh", "MKeshGateway"),
    "stripe": ("integrations.payments.stripe", "StripeGateway"),
    "paypal": ("integrations.payments.paypal", "PaypalGateway"),
}


def _load_gateway_class(name: str):
    module_name, class_name = _GATEWAY_IMPORTS[name]
    module = import_module(module_name)
    return getattr(module, class_name)


def get_gateway(name: str | None = None):
    name = name or getattr(settings, "PAYMENT_GATEWAY", "mpesa")

    if name not in _GATEWAY_IMPORTS:
        raise ValueError(f"Gateway desconhecido: {name}")

    return _load_gateway_class(name)()
