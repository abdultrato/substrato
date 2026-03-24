import time

from .metricas import registrar_requisicao


class RastreamentoTempo:
    def __enter__(self):
        self.inicio = time.time()

    def __exit__(self, exc_type, exc_val, exc_tb):
        duracao = time.time() - self.inicio
        registrar_requisicao(duracao)
