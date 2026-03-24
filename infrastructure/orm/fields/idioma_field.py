from django.db import models

from core.internationalization.idioma_service import listar_idiomas_iso


class IdiomaField(models.CharField):
    """
    Campo de idioma baseado em ISO 639-1.
    Ex: pt, en, fr, es
    """

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("max_length", 2)
        kwargs.setdefault("choices", listar_idiomas_iso())
        kwargs.setdefault("default", "pt")
        super().__init__(*args, **kwargs)
