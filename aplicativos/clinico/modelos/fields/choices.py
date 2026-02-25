from django.db import models


class Currency(models.TextChoices):
    MZN = "MZN", "Metical"
    USD = "USD", "US Dollar"
    EUR = "EUR", "Euro"
    ZAR = "ZAR", "Rand Sul-Africano"


class TipoResultado(models.TextChoices):
    NUMERICO = "NUM", "Numérico"
    QUALITATIVO = "QLT", "Qualitativo"
    SEMIQUANTITATIVO = "SMQ", "Semi-quantitativo"
    TEXTO = "TXT", "Texto livre"
