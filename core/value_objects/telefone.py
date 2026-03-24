import re


class Telefone:
    def __init__(self, numero: str):
        numero = re.sub(r"\D", "", numero or "")

        if len(numero) < 8:
            raise ValueError("Telefone inválido.")

        self.numero = numero

    def __str__(self):
        return self.numero
