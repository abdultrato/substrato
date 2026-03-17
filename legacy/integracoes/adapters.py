from collections.abc import Callable
import logging

from frontend.core.events.bus import event_bus
from frontend.core.events.events import (
    INSURANCE_UPDATED,
    LAB_RESULT_READY,
    PAYMENT_RECEIVED,
)

logger = logging.getLogger("webhooks")


# =====================================================
# PROVIDER REGISTRY
# =====================================================

_PROVIDER_HANDLERS: dict[str, Callable[[dict], None]] = {}


def register_provider(name: str):
    """
    Decorator para registrar handlers dinamicamente.

    Uso:

        @register_provider("mpesa")
        def handle_mpesa(data):
            ...
    """

    def decorator(func: Callable[[dict], None]):
        _PROVIDER_HANDLERS[name.lower()] = func
        return func

    return decorator


# =====================================================
# DISPATCHER
# =====================================================


def dispatch_webhook_event(provider: str, payload: dict):
    """
    Roteia eventos recebidos para o handler correto.
    """

    if not isinstance(payload, dict):
        logger.warning(
            "invalid_payload",
            extra={"provider": provider},
        )
        return

    handler = _PROVIDER_HANDLERS.get(provider.lower())

    if not handler:
        logger.warning(
            "unknown_provider",
            extra={"provider": provider},
        )
        return

    logger.info(
        "webhook_received",
        extra={"provider": provider},
    )

    handler(payload)


# =====================================================
# PAYMENT PROVIDERS
# =====================================================


@register_provider("mpesa")
def handle_mpesa(data: dict):
    logger.info("payment_event", extra={"provider": "mpesa"})
    event_bus.publish(PAYMENT_RECEIVED, data)


@register_provider("emola")
def handle_emola(data: dict):
    logger.info("payment_event", extra={"provider": "emola"})
    event_bus.publish(PAYMENT_RECEIVED, data)


@register_provider("mkesh")
def handle_mkesh(data: dict):
    logger.info("payment_event", extra={"provider": "mkesh"})
    event_bus.publish(PAYMENT_RECEIVED, data)


@register_provider("stripe")
def handle_stripe(data: dict):
    logger.info("payment_event", extra={"provider": "stripe"})
    event_bus.publish(PAYMENT_RECEIVED, data)


@register_provider("paypal")
def handle_paypal(data: dict):
    logger.info("payment_event", extra={"provider": "paypal"})
    event_bus.publish(PAYMENT_RECEIVED, data)


# =====================================================
# LABORATORY SYSTEM
# =====================================================


@register_provider("lab")
def handle_laboratory(data: dict):
    logger.info("lab_result_received")
    event_bus.publish(LAB_RESULT_READY, data)


# =====================================================
# INSURANCE SYSTEM
# =====================================================


@register_provider("insurance")
def handle_insurance(data: dict):
    logger.info("insurance_updated")
    event_bus.publish(INSURANCE_UPDATED, data)
