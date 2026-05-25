from __future__ import annotations

from typing import Any


class BarramentoEventosDominio:
    def __init__(self, publicar_apos_commit: bool = True) -> None:
        self.publicar_apos_commit = publicar_apos_commit
        self.eventos_publicados: list[Any] = []

    def publicar(self, evento: Any) -> None:
        evento_convertido = self._converter_evento(evento)
        try:
            from events.bus import event_bus

            if self.publicar_apos_commit:
                event_bus.publish_after_commit(evento_convertido)
            else:
                event_bus.publish(evento_convertido)
        except Exception:
            self.eventos_publicados.append(evento_convertido)

    @staticmethod
    def _converter_evento(evento: Any) -> Any:
        if hasattr(evento, "to_evento_corporativo"):
            return evento.to_evento_corporativo()
        return evento
