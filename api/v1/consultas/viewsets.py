"""
Facade module for Consultas ViewSets.
"""

from .viewsets_impl import (
    VIEWSET_MAP,
    ConsultaMedicaViewSet,
    EspecialidadeConsultaViewSet,
    FeriadoViewSet,
    MedicosViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "ConsultaMedicaViewSet",
    "EspecialidadeConsultaViewSet",
    "FeriadoViewSet",
    "MedicosViewSet",
]
