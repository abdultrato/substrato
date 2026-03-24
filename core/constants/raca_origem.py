from django.db import models


class RacaOrigem(models.TextChoices):
    BRANCA = "Branca", "Branca"
    NEGRA = "Negra", "Negra"
    PARDA = "Parda", "Parda"
    AMARELA = "Amarela", "Amarela"
    INDIGENA = "Indígena", "Indígena"
    OUTRO = "Outro", "Outro"
