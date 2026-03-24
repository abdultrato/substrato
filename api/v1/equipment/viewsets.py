"""
Facade module for Equipamentos ViewSets.
"""

from .viewsets_impl import (
    VIEWSET_MAP,
    EquipamentoViewSet,
    InspecaoDiariaViewSet,
    ManutencaoViewSet,
    OcorrenciaViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "EquipamentoViewSet",
    "InspecaoDiariaViewSet",
    "ManutencaoViewSet",
    "OcorrenciaViewSet",
]
