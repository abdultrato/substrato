"""
Facade module for Recursos Humanos ViewSets.
"""

from .viewsets_impl import (
    VIEWSET_MAP,
    AgregadoFamiliarViewSet,
    CargoViewSet,
    DispensaViewSet,
    FaltaViewSet,
    FeriasViewSet,
    FolhaPagamentoViewSet,
    FuncionarioViewSet,
    HoraExtraViewSet,
    HorarioTrabalhoViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "AgregadoFamiliarViewSet",
    "CargoViewSet",
    "DispensaViewSet",
    "FaltaViewSet",
    "FeriasViewSet",
    "FolhaPagamentoViewSet",
    "FuncionarioViewSet",
    "HoraExtraViewSet",
    "HorarioTrabalhoViewSet",
]
