from django.db import models


class ProductType(models.TextChoices):
    MEDICAMENTO = "MED", "Medicamento"
    CONSUMIVEL = "CON", "Consumível"
    OUTRO = "OUT", "Outro"


__all__ = ["ProductType"]
