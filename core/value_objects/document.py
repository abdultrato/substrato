"""Value object para documentos de identificação genéricos."""

import re


class Document:
    def __init__(self, value: str, *, minimum_length: int = 5):
        normalized = re.sub(r"\W", "", value or "").upper()
        if len(normalized) < minimum_length:
            raise ValueError("Documento inválido.")
        self.value = normalized

    def __str__(self):
        return self.value
