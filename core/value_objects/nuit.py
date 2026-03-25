import re


class Nuit:
    def __init__(self, value: str):
        value = re.sub(r"\D", "", value or "")

        if len(value) != 9:
            raise ValueError("NUIT inválido.")

        self.value = value

    def __str__(self):
        return self.value
