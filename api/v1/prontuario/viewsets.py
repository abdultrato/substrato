"""
Facade module for Prontuario ViewSets.
"""

from .viewsets_impl import (
    VIEWSET_MAP,
    PrescricaoItemViewSet,
    RegistroProntuarioViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "PrescricaoItemViewSet",
    "RegistroProntuarioViewSet",
]
