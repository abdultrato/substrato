from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.equipment.models.equipment import Equipment
from apps.incidents.models.incident import Incident
from apps.inspections.models.daily_inspection import DailyInspection
from apps.maintenance.models.maintenance import Maintenance

from ..filters import DailyInspectionFilter, EquipmentFilter, IncidentFilter, MaintenanceFilter
from ..serializers import (
    DailyInspectionSerializer,
    EquipmentSerializer,
    IncidentSerializer,
    MaintenanceSerializer,
)


class EquipmentViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Equipment.objects.all()
    serializer_class = EquipmentSerializer
    filterset_class = EquipmentFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "name",
        "serial_number",
        "manufacturer",
        "model",
        "location",
        "responsible",
    ]
    ordering_fields = [
        "name",
        "serial_number",
        "acquisition_status",
        "initial_operational_status",
        "active",
        "created_at",
        "updated_at",
    ]
    ordering = ["name"]


class DailyInspectionViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DailyInspection.objects.select_related("equipment")
    serializer_class = DailyInspectionSerializer
    filterset_class = DailyInspectionFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "equipment__name",
        "equipment__serial_number",
        "assessment",
        "notes",
    ]
    ordering_fields = [
        "date",
        "operation_status",
        "cleaning_performed",
        "created_at",
        "updated_at",
    ]
    ordering = ["-date", "-created_at"]


class MaintenanceViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Maintenance.objects.select_related("equipment")
    serializer_class = MaintenanceSerializer
    filterset_class = MaintenanceFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "equipment__name",
        "equipment__serial_number",
        "description",
        "technician",
    ]
    ordering_fields = [
        "scheduled_date",
        "performed_date",
        "type",
        "created_at",
        "updated_at",
    ]
    ordering = ["-scheduled_date", "-created_at"]


class IncidentViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Incident.objects.select_related("equipment")
    serializer_class = IncidentSerializer
    filterset_class = IncidentFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "equipment__name",
        "equipment__serial_number",
        "description",
        "support_contact",
    ]
    ordering_fields = [
        "date",
        "type",
        "resolved",
        "created_at",
        "updated_at",
    ]
    ordering = ["-date", "-created_at"]


VIEWSET_MAP = {
    "equipment": EquipmentViewSet,
    "daily_inspection": DailyInspectionViewSet,
    "maintenance": MaintenanceViewSet,
    "incident": IncidentViewSet,
    "inspecaodiaria": DailyInspectionViewSet,
    "manutencao": MaintenanceViewSet,
    "ocorrencia": IncidentViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "DailyInspectionViewSet",
    "EquipmentViewSet",
    "IncidentViewSet",
    "MaintenanceViewSet",
]
