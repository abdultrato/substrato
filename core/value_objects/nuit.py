import re


class Nuit:
    def __init__(self, valor: str):
        valor = re.sub(r"\D", "", valor or "")

        if len(valor) != 9:
            raise ValueError("NUIT inválido.")

        self.valor = valor

    def __str__(self):
        return self.valor
