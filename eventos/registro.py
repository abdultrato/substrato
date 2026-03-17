# LOCAL: eventos/registro.py

from dominio.clinico.eventos import ResultadoValidadoEvent
from dominio.seguradora.eventos import AutorizacaoSolicitadaEvent
from eventos.bus import event_bus
from eventos.handlers import AutorizacaoSolicitadaHandler, ResultadoValidadoHandler


def registrar_handlers():
    event_bus.register(
        ResultadoValidadoEvent,
        ResultadoValidadoHandler.handle,
    )
    event_bus.register(
        AutorizacaoSolicitadaEvent,
        AutorizacaoSolicitadaHandler.handle,
    )
