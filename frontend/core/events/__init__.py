"""Constantes de eventos e barramento legados usados pelo frontend."""

from .bus import event_bus
from .events import INSURANCE_UPDATED, LAB_RESULT_READY, PAYMENT_RECEIVED

__all__ = ["INSURANCE_UPDATED", "LAB_RESULT_READY", "PAYMENT_RECEIVED", "event_bus"]
