from django.db import models


class MovementType(models.TextChoices):
    ENTRADA = "ENT", "Entrada"
    SAIDA = "SAI", "Saída"
    AJUSTE = "AJU", "Ajuste"


TipoMovimento = MovementType
