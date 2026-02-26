from django.db import models


class TipoResultado(models.TextChoices):
    NUMERICO = "NUMERICO", "Numérico"
    QUALITATIVO = "QUALITATIVO", "Qualitativo"
    SEMIQUANTITATIVO = "SEMIQUANTITATIVO", "Semi-quantitativo"
    TEXTO = "TEXTO", "Texto Livre"
