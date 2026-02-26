from django.db import models


class TipoProduto(models.TextChoices):
    MEDICAMENTO = "MED", "Medicamento"
    CONSUMIVEL = "CON", "Consumível"
    OUTRO = "OUT", "Outro"
