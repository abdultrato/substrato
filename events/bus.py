# LOCAL: eventos/bus.py

from collections import defaultdict
from collections.abc import Callable
import logging
from typing import Any

from django.db import transaction

from .runtime_bridge import mirror_event_to_runtime
from .transactional_outbox import enqueue_event_for_outbox, outbox_enabled

logger = logging.getLogger("eventos")


class EventBus:
    """
    EventBus tipado, seguro e transacional.

    ✔ Registro por classe de evento
    ✔ Execução isolada de handlers
    ✔ Proteção contra duplicidade
    ✔ Publicação imediata
    ✔ Publicação após commit
    ✔ Preparado para expansão async
    """

    def __init__(self) -> None:
        self._subscribers: dict[type, list[Callable[[Any], None]]] = defaultdict(list)

    # =====================================================
    # REGISTRO
    # =====================================================

    def register(
        self,
        event_type: type,
        handler: Callable[[Any], None],
    ) -> None:
        """
        Registra um handler para um tipo de evento.
        """

        if handler in self._subscribers[event_type]:
            logger.debug(f"Handler {handler.__name__} já registrado para {event_type.__name__}")
            return

        self._subscribers[event_type].append(handler)

        # Registro de handlers é útil só em DEBUG para evitar ruído no startup.
        logger.debug(f"Handler {handler.__name__} registrado para {event_type.__name__}")

    # =====================================================
    # PUBLICAÇÃO IMEDIATA
    # =====================================================

    def publish(self, event: Any) -> None:
        """
        Publica evento imediatamente.
        """

        event_type = type(event)
        handlers = self._subscribers.get(event_type, [])

        if not handlers:
            logger.debug(f"Nenhum handler para {event_type.__name__}")
        else:
            logger.debug(f"Publicando {event_type.__name__} para {len(handlers)} handler(s)")

            for handler in handlers:
                try:
                    handler(event)
                except Exception:
                    logger.exception(f"Erro no handler {handler.__name__} para {event_type.__name__}")

        mirror_event_to_runtime(event)

    # =====================================================
    # PUBLICAÇÃO APÓS COMMIT
    # =====================================================

    def publish_after_commit(self, event: Any) -> None:
        """
        Garante execução somente após commit do banco.
        """

        def _run_after_commit() -> None:
            if outbox_enabled():
                try:
                    enqueue_event_for_outbox(event)
                except Exception:
                    logger.exception("Falha ao persistir evento no transactional outbox")
            self.publish(event)

        transaction.on_commit(_run_after_commit)


# =====================================================
# SINGLETON GLOBAL
# =====================================================

event_bus = EventBus()
