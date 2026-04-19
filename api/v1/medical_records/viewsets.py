"""Facade module for medical record viewsets."""

from .viewsets_impl import (
    VIEWSET_MAP,
    MedicalRecordEntryViewSet,
    PrescriptionItemViewSet,
)

__all__ = [
    "VIEWSET_MAP",  # Alias -> ViewSet para roteamento dinâmico
    "MedicalRecordEntryViewSet",
    "PrescriptionItemViewSet",
]
