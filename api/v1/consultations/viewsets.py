"""Facade module for consultation viewsets."""

from .viewsets_impl import (
    VIEWSET_MAP,
    ConsultationSpecialtyViewSet,
    DoctorsViewSet,
    HolidayViewSet,
    MedicalConsultationViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "ConsultationSpecialtyViewSet",
    "ConsultationSpecialtyViewSet",
    "DoctorsViewSet",
    "DoctorsViewSet",
    "HolidayViewSet",
    "HolidayViewSet",
    "MedicalConsultationViewSet",
    "MedicalConsultationViewSet",
]
