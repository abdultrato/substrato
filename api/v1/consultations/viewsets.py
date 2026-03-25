"""Facade module for consultation viewsets."""

from .viewsets_impl import (
    VIEWSET_MAP,
    ConsultaMedicaViewSet,
    ConsultationSpecialtyViewSet,
    DoctorsViewSet,
    EspecialidadeConsultaViewSet,
    FeriadoViewSet,
    HolidayViewSet,
    MedicalConsultationViewSet,
    MedicosViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "ConsultaMedicaViewSet",
    "ConsultationSpecialtyViewSet",
    "DoctorsViewSet",
    "EspecialidadeConsultaViewSet",
    "FeriadoViewSet",
    "HolidayViewSet",
    "MedicalConsultationViewSet",
    "MedicosViewSet",
]
