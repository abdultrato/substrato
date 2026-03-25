from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.equipment.models.equipment import Equipment
from apps.incidents.models.incident import Incident
from apps.inspections.models.daily_inspection import DailyInspection
from apps.maintenance.models.maintenance import Maintenance

from ..filters import EquipamentoFilter, InspecaoDiariaFilter, ManutencaoFilter, OcorrenciaFilter
from ..serializers import (
    EquipamentoSerializer,
    InspecaoDiariaSerializer,
    ManutencaoSerializer,
    OcorrenciaSerializer,
)


class EquipamentoViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Equipment.objects.all()
    serializer_class = EquipamentoSerializer
    filterset_class = EquipamentoFilter
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


class InspecaoDiariaViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DailyInspection.objects.select_related("equipment")
    serializer_class = InspecaoDiariaSerializer
    filterset_class = InspecaoDiariaFilter
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


class ManutencaoViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Maintenance.objects.select_related("equipment")
    serializer_class = ManutencaoSerializer
    filterset_class = ManutencaoFilter
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


class OcorrenciaViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Incident.objects.select_related("equipment")
    serializer_class = OcorrenciaSerializer
    filterset_class = OcorrenciaFilter
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
    "equipment": EquipamentoViewSet,
    "inspecaodiaria": InspecaoDiariaViewSet,
    "manutencao": ManutencaoViewSet,
    "ocorrencia": OcorrenciaViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "EquipamentoViewSet",
    "InspecaoDiariaViewSet",
    "ManutencaoViewSet",
    "OcorrenciaViewSet",
]
