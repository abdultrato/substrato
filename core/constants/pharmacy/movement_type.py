from django.db import models


class TipoMovimento(models.TextChoices):
    ENTRADA = "ENT", "Entrada"
    SAIDA = "SAI", "Saída"
    AJUSTE = "AJU", "Ajuste"
