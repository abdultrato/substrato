"""Facade module for medical record viewsets."""

from .viewsets_impl import (
    VIEWSET_MAP,
    MedicalRecordEntryViewSet,
    PrescricaoItemViewSet,
    PrescriptionItemViewSet,
    RegistroProntuarioViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "MedicalRecordEntryViewSet",
    "PrescricaoItemViewSet",
    "PrescriptionItemViewSet",
    "RegistroProntuarioViewSet",
]
