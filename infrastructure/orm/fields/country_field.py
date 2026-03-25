from django.db import models

from core.constants.geography.country_service import list_iso_countries


class CountryField(models.CharField):
    """
    Campo de país baseado em ISO 3166-1 alpha-2.
    Compatível com IA, integrações e padrões internacionais.
    """

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("max_length", 2)
        kwargs.setdefault("choices", list_iso_countries())
        kwargs.setdefault("default", "MZ")
        super().__init__(*args, **kwargs)


