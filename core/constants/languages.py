from django.db import models


class Language(models.TextChoices):
    """
    ISO 639-1 — Códigos internacionais de language.
    """

    PT = "pt", "Português"
    EN = "en", "Inglês"
    FR = "fr", "Francês"
    ES = "es", "Espanhol"
    DE = "de", "Alemão"
    ZH = "zh", "Chinês"
    HI = "hi", "Hindi"
    AR = "ar", "Árabe"
    SW = "sw", "Suaíli"


Idioma = Language
