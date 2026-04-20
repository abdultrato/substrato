from __future__ import annotations

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.bloodbank.models.blood_bank import (
    BloodDonation,
    BloodStockMovement,
    BloodStorage,
    BloodStorageMaintenance,
    BloodTransfusion,
    BloodUnit,
)
from apps.clinical.models.patient import Patient

from ..filters import (
    BloodDonationFilter,
    BloodStockMovementFilter,
    BloodStorageFilter,
    BloodStorageMaintenanceFilter,
    BloodTransfusionFilter,
    BloodUnitFilter,
)
from ..serializers import (
    BloodDonationSerializer,
    BloodStockMovementSerializer,
    BloodStorageMaintenanceSerializer,
    BloodStorageSerializer,
    BloodTransfusionSerializer,
    BloodUnitSerializer,
)


class TenantScopedModelViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    permission_classes = [IsAuthenticated]


class BloodDonationViewSet(TenantScopedModelViewSet):
    queryset = BloodDonation.objects.select_related("donor", "collected_by").all()
    serializer_class = BloodDonationSerializer
    filterset_class = BloodDonationFilter
    search_fields = ["custom_id", "bag_identifier", "donor__name"]
    ordering_fields = ["collected_at", "processed_at", "status", "screening_status", "created_at"]
    ordering = ["-collected_at", "-created_at"]


class BloodStorageViewSet(TenantScopedModelViewSet):
    queryset = BloodStorage.objects.all()
    serializer_class = BloodStorageSerializer
    filterset_class = BloodStorageFilter
    search_fields = ["custom_id", "name", "location"]
    ordering_fields = ["name", "is_active", "created_at"]
    ordering = ["name"]


class BloodUnitReserveSerializer(serializers.Serializer):
    recipient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all())


class BloodUnitTransfuseSerializer(serializers.Serializer):
    recipient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all())
    indication = serializers.CharField(required=False, allow_blank=True, default="")
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class BloodUnitViewSet(TenantScopedModelViewSet):
    queryset = BloodUnit.objects.select_related("donation", "storage", "reserved_for").all()
    serializer_class = BloodUnitSerializer
    filterset_class = BloodUnitFilter
    search_fields = ["custom_id", "unit_number", "donation__bag_identifier", "reserved_for__name"]
    ordering_fields = ["collected_at", "expires_at", "status", "created_at"]
    ordering = ["-collected_at", "-created_at"]

    @action(detail=True, methods=["post"], url_path="reservar", url_name="reservar")
    @transaction.atomic
    def reserve(self, request, pk=None):
        unit: BloodUnit = self.get_object()
        payload = BloodUnitReserveSerializer(data=request.data or {})
        payload.is_valid(raise_exception=True)
        recipient: Patient = payload.validated_data["recipient"]

        if unit.is_expired or unit.status in {BloodUnit.UnitStatus.EXPIRED, BloodUnit.UnitStatus.DISCARDED}:
            raise ValidationError({"status": "Unidade expirada/descartada nao pode ser reservada."})
        if unit.status in {BloodUnit.UnitStatus.TRANSFUSED}:
            raise ValidationError({"status": "Unidade ja foi transfundida."})

        unit.reserved_for = recipient
        unit.status = BloodUnit.UnitStatus.RESERVED
        try:
            unit.save()
        except DjangoValidationError as err:
            raise ValidationError(getattr(err, "message_dict", None) or {"detail": err.messages})

        BloodStockMovement(
            tenant=unit.tenant,
            unit=unit,
            source_storage=unit.storage,
            movement_type=BloodStockMovement.MovementType.RESERVE,
            performed_by=request.user if request.user.is_authenticated else None,
            moved_at=timezone.now(),
            reason="Reserva",
        ).save()

        return Response(BloodUnitSerializer(instance=unit).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="liberar_reserva", url_name="liberar-reserva")
    @transaction.atomic
    def release(self, request, pk=None):
        unit: BloodUnit = self.get_object()

        if unit.status != BloodUnit.UnitStatus.RESERVED:
            raise ValidationError({"status": "Unidade nao esta reservada."})

        unit.reserved_for = None
        unit.status = BloodUnit.UnitStatus.AVAILABLE
        try:
            unit.save()
        except DjangoValidationError as err:
            raise ValidationError(getattr(err, "message_dict", None) or {"detail": err.messages})

        BloodStockMovement(
            tenant=unit.tenant,
            unit=unit,
            source_storage=unit.storage,
            movement_type=BloodStockMovement.MovementType.RELEASE,
            performed_by=request.user if request.user.is_authenticated else None,
            moved_at=timezone.now(),
            reason="Liberacao de reserva",
        ).save()

        return Response(BloodUnitSerializer(instance=unit).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="transfundir", url_name="transfundir")
    @transaction.atomic
    def transfuse(self, request, pk=None):
        unit: BloodUnit = self.get_object()
        payload = BloodUnitTransfuseSerializer(data=request.data or {})
        payload.is_valid(raise_exception=True)
        recipient: Patient = payload.validated_data["recipient"]
        indication: str = payload.validated_data.get("indication", "")
        notes: str = payload.validated_data.get("notes", "")

        if unit.is_expired or unit.status in {BloodUnit.UnitStatus.EXPIRED, BloodUnit.UnitStatus.DISCARDED}:
            raise ValidationError({"status": "Unidade expirada/descartada nao pode ser transfundida."})
        if unit.status == BloodUnit.UnitStatus.TRANSFUSED:
            raise ValidationError({"status": "Unidade ja foi transfundida."})
        if unit.status == BloodUnit.UnitStatus.RESERVED and unit.reserved_for_id != recipient.id:
            raise ValidationError({"reserved_for": "Unidade reservada para outro paciente."})

        # Create transfusion record (COMPLETED by default).
        now = timezone.now()
        transfusion = BloodTransfusion(
            tenant=unit.tenant,
            recipient=recipient,
            blood_unit=unit,
            requested_by=request.user if request.user.is_authenticated else None,
            performed_by=request.user if request.user.is_authenticated else None,
            status=BloodTransfusion.TransfusionStatus.COMPLETED,
            requested_at=now,
            started_at=now,
            finished_at=now,
            indication=indication,
            notes=notes,
        )
        try:
            transfusion.save()
        except DjangoValidationError as err:
            raise ValidationError(getattr(err, "message_dict", None) or {"detail": err.messages})

        unit.reserved_for = recipient
        unit.status = BloodUnit.UnitStatus.TRANSFUSED
        try:
            unit.save()
        except DjangoValidationError as err:
            raise ValidationError(getattr(err, "message_dict", None) or {"detail": err.messages})

        BloodStockMovement(
            tenant=unit.tenant,
            unit=unit,
            source_storage=unit.storage,
            movement_type=BloodStockMovement.MovementType.OUTBOUND,
            performed_by=request.user if request.user.is_authenticated else None,
            moved_at=now,
            reason="Transfusao",
        ).save()

        return Response(
            {
                "unit": BloodUnitSerializer(instance=unit).data,
                "transfusion": BloodTransfusionSerializer(instance=transfusion).data,
            },
            status=status.HTTP_200_OK,
        )


class BloodTransfusionViewSet(TenantScopedModelViewSet):
    queryset = BloodTransfusion.objects.select_related("recipient", "blood_unit").all()
    serializer_class = BloodTransfusionSerializer
    filterset_class = BloodTransfusionFilter
    search_fields = ["custom_id", "recipient__name", "blood_unit__unit_number"]
    ordering_fields = ["requested_at", "status", "created_at"]
    ordering = ["-requested_at", "-created_at"]


class BloodStockMovementViewSet(TenantScopedModelViewSet):
    queryset = BloodStockMovement.objects.select_related("unit", "source_storage", "destination_storage").all()
    serializer_class = BloodStockMovementSerializer
    filterset_class = BloodStockMovementFilter
    search_fields = ["custom_id", "unit__unit_number", "reason"]
    ordering_fields = ["moved_at", "movement_type", "created_at"]
    ordering = ["-moved_at", "-created_at"]


class BloodStorageMaintenanceViewSet(TenantScopedModelViewSet):
    queryset = BloodStorageMaintenance.objects.select_related("storage").all()
    serializer_class = BloodStorageMaintenanceSerializer
    filterset_class = BloodStorageMaintenanceFilter
    search_fields = ["custom_id", "storage__name", "technician_name"]
    ordering_fields = ["scheduled_at", "status", "maintenance_type", "created_at"]
    ordering = ["-scheduled_at", "-created_at"]


VIEWSET_MAP = {
    "doacao": BloodDonationViewSet,
    "armazenamento": BloodStorageViewSet,
    "unidade": BloodUnitViewSet,
    "transfusao": BloodTransfusionViewSet,
    "movimentoestoque": BloodStockMovementViewSet,
    "manutencaoarmazenamento": BloodStorageMaintenanceViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "BloodDonationViewSet",
    "BloodStorageViewSet",
    "BloodUnitViewSet",
    "BloodTransfusionViewSet",
    "BloodStockMovementViewSet",
    "BloodStorageMaintenanceViewSet",
]

