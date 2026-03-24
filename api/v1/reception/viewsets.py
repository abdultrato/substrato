"""
Facade module for Recepcao ViewSets.
"""

from .viewsets_impl import (
    VIEWSET_MAP,
    AtendimentoRecepcaoViewSet,
    CheckinRecepcaoViewSet,
    WorkspaceRecepcaoViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "AtendimentoRecepcaoViewSet",
    "CheckinRecepcaoViewSet",
    "WorkspaceRecepcaoViewSet",
]
