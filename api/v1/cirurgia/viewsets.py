"""
Facade module for Cirurgia ViewSets.
"""

from .viewsets_impl import (
    VIEWSET_MAP,
    CirurgiaViewSet,
    ProcedimentoCirurgicoViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "CirurgiaViewSet",
    "ProcedimentoCirurgicoViewSet",
]
