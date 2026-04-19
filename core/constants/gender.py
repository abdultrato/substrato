"""Enum de gênero suportado pelo sistema."""

from django.db import models


class Gender(models.TextChoices):
    """Enumeração de gênero."""

    MALE = "Masculino", "Masculino"
    FEMALE = "Femenino", "Femenino"


__all__ = ["Gender"]
