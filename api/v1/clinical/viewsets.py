"""
Facade module for clinical viewsets.

The implementation is split into smaller modules under `viewsets_impl/`, while
top-level imports remain stable.
"""

from .viewsets_impl import (
    VIEWSET_MAP,
    LabExamFieldViewSet,
    LabExamViewSet,
    LabRequestItemViewSet,
    LabRequestViewSet,
    MedicalExamFieldViewSet,
    MedicalExamViewSet,
    MedicalResultFileViewSet,
    PatientViewSet,
    ResultItemViewSet,
    SampleViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "LabExamFieldViewSet",
    "LabExamFieldViewSet",
    "LabExamViewSet",
    "LabExamViewSet",
    "LabRequestItemViewSet",
    "LabRequestItemViewSet",
    "LabRequestViewSet",
    "LabRequestViewSet",
    "MedicalExamFieldViewSet",
    "MedicalExamFieldViewSet",
    "MedicalExamViewSet",
    "MedicalExamViewSet",
    "MedicalResultFileViewSet",
    "MedicalResultFileViewSet",
    "PatientViewSet",
    "PatientViewSet",
    "ResultItemViewSet",
    "ResultItemViewSet",
    "SampleViewSet",
    "SampleViewSet",
]
