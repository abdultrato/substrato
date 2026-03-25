"""
Facade module for clinical viewsets.

The implementation is split into smaller modules under `viewsets_impl/`, while
top-level imports remain stable.
"""

from .viewsets_impl import (
    VIEWSET_MAP,
    ExameCampoViewSet,
    ExameMedicoCampoViewSet,
    ExameMedicoViewSet,
    ExameViewSet,
    LabExamFieldViewSet,
    LabExamViewSet,
    LabRequestItemViewSet,
    LabRequestViewSet,
    MedicalExamFieldViewSet,
    MedicalExamViewSet,
    MedicalResultFileViewSet,
    PacienteViewSet,
    PatientViewSet,
    RequisicaoAnaliseViewSet,
    RequisicaoItemViewSet,
    ResultadoItemViewSet,
    ResultadoMedicoArquivoViewSet,
    ResultItemViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "ExameCampoViewSet",
    "ExameMedicoCampoViewSet",
    "ExameMedicoViewSet",
    "ExameViewSet",
    "LabExamFieldViewSet",
    "LabExamViewSet",
    "LabRequestItemViewSet",
    "LabRequestViewSet",
    "MedicalExamFieldViewSet",
    "MedicalExamViewSet",
    "MedicalResultFileViewSet",
    "PacienteViewSet",
    "PatientViewSet",
    "RequisicaoAnaliseViewSet",
    "RequisicaoItemViewSet",
    "ResultItemViewSet",
    "ResultadoItemViewSet",
    "ResultadoMedicoArquivoViewSet",
]
