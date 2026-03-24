"""
Facade module for clinical viewsets.

The implementation is split into smaller modules under `viewsets_impl/`, while
top-level imports remain stable.
"""

from .viewsets_impl import (
    VIEWSET_MAP,
    LabExamFieldViewSet,
    MedicalExamFieldViewSet,
    LabExamViewSet,
    MedicalExamViewSet,
    PatientViewSet,
    LabRequestViewSet,
    LabRequestItemViewSet,
    ResultItemViewSet,
    MedicalResultFileViewSet,
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
    "LabExamFieldViewSet",
    "MedicalExamFieldViewSet",
    "LabExamViewSet",
    "MedicalExamViewSet",
    "PatientViewSet",
    "LabRequestViewSet",
    "LabRequestItemViewSet",
    "ResultItemViewSet",
    "MedicalResultFileViewSet",
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
