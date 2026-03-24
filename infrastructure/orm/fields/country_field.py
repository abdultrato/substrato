from django.db import models

from core.constants.geography.country_service import listar_paises_iso


class CountryField(models.CharField):
    """
    Campo de país baseado em ISO 3166-1 alpha-2.
    Compatível com IA, integrações e padrões internacionais.
    """

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("max_length", 2)
        kwargs.setdefault("choices", listar_paises_iso())
        kwargs.setdefault("default", "MZ")
        super().__init__(*args, **kwargs)

PaisField = CountryField


