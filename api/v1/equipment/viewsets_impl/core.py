from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated  # Protege endpoints
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet  # CRUD base DRF

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
        "requires_maintenance",
        "active",
        "created_at",
        "updated_at",
    ]
    ordering = ["name"]

    @action(detail=True, methods=["post"], url_path="ativar", url_name="ativar")
    def ativar(self, request, pk=None):
        equipment = self.get_object()
        equipment.activate()
        return Response(self.get_serializer(equipment).data)

    @action(detail=True, methods=["post"], url_path="inativar", url_name="inativar")
    def inativar(self, request, pk=None):
        equipment = self.get_object()
        equipment.deactivate()
        return Response(self.get_serializer(equipment).data)


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
    queryset = Maintenance.objects.select_related("equipment", "incident")
    serializer_class = MaintenanceSerializer
    filterset_class = MaintenanceFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "equipment__name",
        "equipment__serial_number",
        "description",
        "technician",
        "incident__custom_id",
        "incident__description",
    ]
    ordering_fields = [
        "scheduled_date",
        "performed_date",
        "type",
        "maintenance_type",
        "created_at",
        "updated_at",
    ]
    ordering = ["-scheduled_date", "-created_at"]

    @action(detail=False, methods=["get"], url_path="pending-requests")
    def pending_requests(self, request):
        queryset = (
            Incident.objects.select_related("equipment")
            .filter(requires_maintenance=True, resolved=False)
            .order_by("maintenance_requested_at", "date", "created_at")
        )
        tenant = self._get_request_tenant()
        if tenant is not None:
            queryset = queryset.filter(tenant=tenant)

        page = self.paginate_queryset(queryset)
        serializer_context = self.get_serializer_context()
        if page is not None:
            serializer = IncidentSerializer(page, many=True, context=serializer_context)
            return self.get_paginated_response(serializer.data)

        serializer = IncidentSerializer(queryset, many=True, context=serializer_context)
        return Response(serializer.data)


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
        "post_incident_actions",
    ]
    ordering_fields = [
        "date",
        "type",
        "resolved",
        "requires_maintenance",
        "maintenance_requested_at",
        "maintenance_completed_at",
        "created_at",
        "updated_at",
    ]
    ordering = ["-date", "-created_at"]

    @action(detail=True, methods=["post"], url_path="perform-maintenance")
    def perform_maintenance(self, request, pk=None):
        incident = self.get_object()
        if not incident.equipment_id:
            return Response(
                {"detail": "Esta ocorrência não está vinculada a um equipamento."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if incident.resolved and not incident.requires_maintenance:
            return Response(
                {"detail": "Esta ocorrência já não possui manutenção pendente."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payload = dict(request.data)
        post_incident_actions = str(payload.pop("post_incident_actions", "") or "").strip()
        payload["incident"] = incident.pk
        payload["equipment"] = incident.equipment_id
        payload.setdefault("type", Maintenance.Type.MONTHLY)
        payload.setdefault("scheduled_date", timezone.localdate().isoformat())
        payload.setdefault("performed_date", timezone.localdate().isoformat())

        serializer = MaintenanceSerializer(data=payload, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            if post_incident_actions:
                existing = (incident.post_incident_actions or "").strip()
                incident.post_incident_actions = (
                    f"{existing}\n\n{post_incident_actions}" if existing else post_incident_actions
                )
                incident.save(update_fields=["post_incident_actions"])

            save_kwargs = {}
            if incident.tenant_id:
                save_kwargs["tenant"] = incident.tenant
            maintenance = serializer.save(**save_kwargs)
            incident.refresh_from_db()
            maintenance.incident = incident

        return Response(
            MaintenanceSerializer(maintenance, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED,
        )


VIEWSET_MAP = {
    "equipment": EquipmentViewSet,
    "daily_inspection": DailyInspectionViewSet,
    "incident": IncidentViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "DailyInspectionViewSet",
    "EquipmentViewSet",
    "IncidentViewSet",
    "MaintenanceViewSet",
]
