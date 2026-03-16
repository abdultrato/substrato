from django.db import models

from nucleo.geografia.pais_service import listar_paises_iso


class PaisField(models.CharField):
    """
    Campo de país baseado em ISO 3166-1 alpha-2.
    Compatível com IA, integrações e padrões internacionais.
    """

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("max_length", 2)
        kwargs.setdefault("choices", listar_paises_iso())
        kwargs.setdefault("default", "MZ")
        super().__init__(*args, **kwargs)
