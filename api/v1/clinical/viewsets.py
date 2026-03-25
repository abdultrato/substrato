"""
Facade module for clinical viewsets.

The implementation is split into smaller modules under `viewsets_impl/`, while
top-level imports remain stable.
"""

from .viewsets_impl import (
    VIEWSET_MAP,
    LabExamFieldViewSet,
    MedicalExamFieldViewSet,
    MedicalExamViewSet,
    LabExamViewSet,
    LabExamFieldViewSet,
    LabExamViewSet,
    LabRequestItemViewSet,
    LabRequestViewSet,
    MedicalExamFieldViewSet,
    MedicalExamViewSet,
    MedicalResultFileViewSet,
    PatientViewSet,
    PatientViewSet,
    LabRequestViewSet,
    LabRequestItemViewSet,
    ResultItemViewSet,
    MedicalResultFileViewSet,
    ResultItemViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "LabExamFieldViewSet",
    "MedicalExamFieldViewSet",
    "MedicalExamViewSet",
    "LabExamViewSet",
    "LabExamFieldViewSet",
    "LabExamViewSet",
    "LabRequestItemViewSet",
    "LabRequestViewSet",
    "MedicalExamFieldViewSet",
    "MedicalExamViewSet",
    "MedicalResultFileViewSet",
    "PatientViewSet",
    "PatientViewSet",
    "LabRequestViewSet",
    "LabRequestItemViewSet",
    "ResultItemViewSet",
    "ResultItemViewSet",
    "MedicalResultFileViewSet",
]
