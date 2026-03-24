"""
Facade module for Clinico ViewSets.

The implementation is split into smaller modules under `viewsets_impl/`, but
external imports remain stable:

    from api.v1.clinical.viewsets import VIEWSET_MAP, PacienteViewSet, ...
"""

from .viewsets_impl import (
    VIEWSET_MAP,
    ExameCampoViewSet,
    ExameMedicoCampoViewSet,
    ExameMedicoViewSet,
    ExameViewSet,
    PacienteViewSet,
    RequisicaoAnaliseViewSet,
    RequisicaoItemViewSet,
    ResultadoItemViewSet,
    ResultadoMedicoArquivoViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "ExameCampoViewSet",
    "ExameMedicoCampoViewSet",
    "ExameMedicoViewSet",
    "ExameViewSet",
    "PacienteViewSet",
    "RequisicaoAnaliseViewSet",
    "RequisicaoItemViewSet",
    "ResultadoItemViewSet",
    "ResultadoMedicoArquivoViewSet",
]
