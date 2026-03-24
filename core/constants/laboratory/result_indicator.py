from django.db import models


class ResultIndicator(models.TextChoices):
    NORMAL = "N", "Normal"

    BAIXO = "↓", "Baixo"
    ALTO = "↑", "Alto"

    MUITO_BAIXO = "↓↓", "Muito baixo"
    MUITO_ALTO = "↑↑", "Muito alto"

    INDETERMINADO = "?", "Indeterminado"


IndicadorResultado = ResultIndicator
