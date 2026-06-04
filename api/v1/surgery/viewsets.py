"""Facade module for surgery viewsets."""

from .viewsets_impl import (
    VIEWSET_MAP,
    AnesthesiaRecordViewSet,
    BaseSurgeryViewSet,
    LargeSurgeryViewSet,
    OperatingRoomViewSet,
    OperativeReportViewSet,
    RecoveryRecordViewSet,
    SmallSurgeryViewSet,
    SurgeryOperationsViewSet,
    SurgeryViewSet,
    SurgicalConsumptionViewSet,
    SurgicalMaterialViewSet,
    SurgicalProcedureViewSet,
    SurgicalSafetyChecklistViewSet,
    SurgicalScheduleViewSet,
    SurgicalTeamMemberViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "AnesthesiaRecordViewSet",
    "BaseSurgeryViewSet",
    "LargeSurgeryViewSet",
    "OperatingRoomViewSet",
    "OperativeReportViewSet",
    "RecoveryRecordViewSet",
    "SmallSurgeryViewSet",
    "SurgeryOperationsViewSet",
    "SurgeryViewSet",
    "SurgicalConsumptionViewSet",
    "SurgicalMaterialViewSet",
    "SurgicalProcedureViewSet",
    "SurgicalSafetyChecklistViewSet",
    "SurgicalScheduleViewSet",
    "SurgicalTeamMemberViewSet",
]
