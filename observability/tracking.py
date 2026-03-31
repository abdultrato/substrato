import time

from .metrics import register_request


class TimeTracking:
    def __enter__(self):
        self.start = time.time()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = time.time() - self.start
        register_request(duration)


RastreamentoTempo = TimeTracking
"""Ferramentas de rastreamento de eventos/navegação."""
