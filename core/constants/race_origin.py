from django.db import models


class RaceOrigin(models.TextChoices):
    """
    Enumeração de raça/origem.
    """

    WHITE = "Branca", "Branca"
    BLACK = "Negra", "Negra"
    BROWN = "Parda", "Parda"
    YELLOW = "Amarela", "Amarela"
    INDIGENOUS = "Indígena", "Indígena"
    OTHER = "Outro", "Outro"


__all__ = ["RaceOrigin"]
