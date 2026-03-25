"""Facade module for Nursing ViewSets."""

from .viewsets_impl import (
    VIEWSET_MAP,
    NursingEvolutionViewSet,
    NursingPrescriptionViewSet,
    NursingRecordViewSet,
    NursingVitalSignViewSet,
    ProcedureCatalogMaterialViewSet,
    ProcedureCatalogViewSet,
    ProcedureItemValueViewSet,
    ProcedureItemViewSet,
    ProcedureMaterialValueViewSet,
    ProcedureMaterialViewSet,
    ProcedureViewSet,
    WardAdmissionViewSet,
    WardBedViewSet,
    WardDashboardViewSet,
    WardViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "NursingEvolutionViewSet",
    "NursingPrescriptionViewSet",
    "NursingRecordViewSet",
    "NursingVitalSignViewSet",
    "ProcedureCatalogMaterialViewSet",
    "ProcedureCatalogViewSet",
    "ProcedureItemValueViewSet",
    "ProcedureItemViewSet",
    "ProcedureMaterialValueViewSet",
    "ProcedureMaterialViewSet",
    "ProcedureViewSet",
    "WardAdmissionViewSet",
    "WardBedViewSet",
    "WardDashboardViewSet",
    "WardViewSet",
]


