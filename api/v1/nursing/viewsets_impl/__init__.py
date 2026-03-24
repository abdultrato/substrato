from .core import (
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


CamaEnfermariaViewSet = WardBedViewSet
EnfermariaDashboardViewSet = WardDashboardViewSet
EnfermariaViewSet = WardViewSet
EvolucaoEnfermagemViewSet = NursingEvolutionViewSet
InternamentoEnfermariaViewSet = WardAdmissionViewSet
PrescricaoEnfermagemViewSet = NursingPrescriptionViewSet
ProcedimentoCatalogoMaterialViewSet = ProcedureCatalogMaterialViewSet
ProcedimentoCatalogoViewSet = ProcedureCatalogViewSet
ProcedimentoItemValorViewSet = ProcedureItemValueViewSet
ProcedimentoItemViewSet = ProcedureItemViewSet
ProcedimentoMaterialValorViewSet = ProcedureMaterialValueViewSet
ProcedimentoMaterialViewSet = ProcedureMaterialViewSet
ProcedimentoViewSet = ProcedureViewSet
RegistroEnfermagemViewSet = NursingRecordViewSet
SinalVitalEnfermagemViewSet = NursingVitalSignViewSet
