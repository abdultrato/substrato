"""Value object de telefone com normalização básica."""

import re


class Phone:
    def __init__(self, number: str):
        sanitized_number = re.sub(r"\D", "", number or "")

        if len(sanitized_number) < 8:
            raise ValueError("Telefone inválido.")

        self.number = sanitized_number

    def __str__(self):
        return self.number


Telefone = Phone
