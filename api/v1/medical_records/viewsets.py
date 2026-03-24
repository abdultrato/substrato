"""Facade module for medical record viewsets."""

from .viewsets_impl import (
    VIEWSET_MAP,
    MedicalRecordEntryViewSet,
    PrescriptionItemViewSet,
    PrescricaoItemViewSet,
    RegistroProntuarioViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "PrescriptionItemViewSet",
    "MedicalRecordEntryViewSet",
    "PrescricaoItemViewSet",
    "RegistroProntuarioViewSet",
]
