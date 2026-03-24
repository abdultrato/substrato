from django.db import models


class Genero(models.TextChoices):
    MASCULINO = "Masculino", "Masculino"
    FEMENINO = "Femenino", "Femenino"
