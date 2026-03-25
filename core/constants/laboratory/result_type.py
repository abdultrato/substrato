from django.db import models


class ResultType(models.TextChoices):
    NUMERICO = "NUMERICO", "Numérico"
    QUALITATIVO = "QUALITATIVO", "Qualitativo"
    SEMIQUANTITATIVO = "SEMIQUANTITATIVO", "Semi-quantitativo"
    TEXTO = "TEXTO", "Texto Livre"


__all__ = ["ResultType"]
