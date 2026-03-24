import re

from django.core.exceptions import ValidationError
from django.db import models


class NameField(models.CharField):
    PREPOSICOES = {"da", "de", "do", "das", "dos", "e"}
    REGEX_VALIDO = re.compile(r"^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$")

    def _normalizar(self, value: str) -> str:
        value = re.sub(r"\s+", " ", value.strip())
        partes = value.lower().split(" ")
        resultado = []

        for p in partes:
            if p in self.PREPOSICOES:
                resultado.append(p)
            else:
                resultado.append(p.capitalize())

        return " ".join(resultado)

    def to_python(self, value):
        value = super().to_python(value)
        if isinstance(value, str):
            value = self._normalizar(value)
        return value

    def validate(self, value, model_instance):
        super().validate(value, model_instance)

        if value and not self.REGEX_VALIDO.match(value):
            raise ValidationError("Nome contém caracteres inválidos.")

NomeField = NameField


