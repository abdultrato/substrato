from . import country_service
from .country_service import (
    get_country_name,
    list_iso_countries,
    listar_paises_iso,
    obter_nome_pais,
)

pais_service = country_service

__all__ = [
    "country_service",
    "get_country_name",
    "list_iso_countries",
    "listar_paises_iso",
    "obter_nome_pais",
    "pais_service",
]
