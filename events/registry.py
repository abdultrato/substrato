# LOCAL: eventos/registro.py

from domain.clinical.events import ResultValidatedEvent
from domain.insurer.events import AuthorizationRequestedEvent
from events.bus import event_bus
from events.handlers import AuthorizationRequestedHandler, ResultValidatedHandler


def register_handlers():
    event_bus.register(
        ResultValidatedEvent,
        ResultValidatedHandler.handle,
    )
    event_bus.register(
        AuthorizationRequestedEvent,
        AuthorizationRequestedHandler.handle,
    )


registrar_handlers = register_handlers
