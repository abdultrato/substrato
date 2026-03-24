# LOCAL: eventos/registro.py

from domain.clinical.events import ResultadoValidadoEvent
from domain.insurer.events import AutorizacaoSolicitadaEvent
from events.bus import event_bus
from events.handlers import AutorizacaoSolicitadaHandler, ResultadoValidadoHandler


def registrar_handlers():
    event_bus.register(
        ResultadoValidadoEvent,
        ResultadoValidadoHandler.handle,
    )
    event_bus.register(
        AutorizacaoSolicitadaEvent,
        AutorizacaoSolicitadaHandler.handle,
    )
