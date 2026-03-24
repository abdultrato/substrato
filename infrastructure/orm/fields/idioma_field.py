from django.db import models

from core.internationalization.language_service import list_iso_languages


class IdiomaField(models.CharField):
    """
    Campo de idioma baseado em ISO 639-1.
    Ex: pt, en, fr, es
    """

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("max_length", 2)
        kwargs.setdefault("choices", list_iso_languages())
        kwargs.setdefault("default", "pt")
        super().__init__(*args, **kwargs)
