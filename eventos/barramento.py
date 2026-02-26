import logging

from .registro import obter_handlers

logger = logging.getLogger(__name__)


class BarramentoEventos:
    """
    Barramento síncrono corporativo.
    """

    @staticmethod
    def publicar(evento):
        handlers = obter_handlers(evento.nome)

        if not handlers:
            logger.debug(f"Nenhum handler registrado para evento: {evento.nome}")
            return

        for handler in handlers:
            try:
                handler(evento)
            except Exception as erro:
                logger.exception(
                    f"Erro ao processar evento {evento.nome} no handler {handler.__name__}"
                )
