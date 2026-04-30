from __future__ import annotations

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.decorators import action
from rest_framework.exceptions import MethodNotAllowed, ValidationError
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

    def create(self, request, *args, **kwargs):
        raise MethodNotAllowed("POST", detail="Armazenamento de sangue é somente leitura.")

    def update(self, request, *args, **kwargs):
        raise MethodNotAllowed("PUT", detail="Armazenamento de sangue é somente leitura.")

    def partial_update(self, request, *args, **kwargs):
        raise MethodNotAllowed("PATCH", detail="Armazenamento de sangue é somente leitura.")

    def destroy(self, request, *args, **kwargs):
        raise MethodNotAllowed("DELETE", detail="Armazenamento de sangue é somente leitura.")


class BloodUnitReserveSerializer(serializers.Serializer):
    recipient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all())


class BloodUnitTransfuseSerializer(serializers.Serializer):
    recipient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all())
    indication = serializers.CharField(required=False, allow_blank=True, default="")
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class BloodUnitForwardSerializer(serializers.Serializer):
    sector = serializers.CharField(max_length=80)
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class BloodUnitDispatchOutcomeSerializer(serializers.Serializer):
    outcome = serializers.ChoiceField(choices=BloodUnit.DispatchOutcome.choices)
    recipient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all(), required=False, allow_null=True)
    indication = serializers.CharField(required=False, allow_blank=True, default="")
    notes = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        outcome = attrs.get("outcome")
        recipient = attrs.get("recipient")
        if outcome == BloodUnit.DispatchOutcome.TRANSFUSED and recipient is None:
            raise serializers.ValidationError({"recipient": "Informe o paciente quando o desfecho for transfundida."})
        return attrs


class BloodUnitViewSet(TenantScopedModelViewSet):
    queryset = BloodUnit.objects.select_related("donation", "storage", "reserved_for").all()
    serializer_class = BloodUnitSerializer
    filterset_class = BloodUnitFilter
    search_fields = ["custom_id", "unit_number", "donation__bag_identifier", "reserved_for__name"]
    ordering_fields = ["collected_at", "expires_at", "status", "created_at"]
    ordering = ["-collected_at", "-created_at"]

    def create(self, request, *args, **kwargs):
        raise MethodNotAllowed("POST", detail="Unidade de sangue não pode ser criada manualmente.")

    def destroy(self, request, *args, **kwargs):
        raise MethodNotAllowed("DELETE", detail="Unidade de sangue não pode ser removida manualmente.")

    @staticmethod
    def _current_user(request):
        return request.user if request.user.is_authenticated else None

    @staticmethod
    def _save_with_validation(instance):
        try:
            instance.save()
        except DjangoValidationError as err:
            raise ValidationError(getattr(err, "message_dict", None) or {"detail": err.messages})

    @staticmethod
    def _create_completed_transfusion(*, unit: BloodUnit, recipient: Patient, user, indication: str, notes: str):
        now = timezone.now()
        transfusion = BloodTransfusion(
            tenant=unit.tenant,
            recipient=recipient,
            blood_unit=unit,
            requested_by=user,
            performed_by=user,
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
        return transfusion, now

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
        if unit.status == BloodUnit.UnitStatus.QUARANTINE:
            raise ValidationError({"status": "Unidade em quarentena nao pode ser reservada."})
        if unit.status == BloodUnit.UnitStatus.FORWARDED:
            raise ValidationError({"status": "Unidade já foi aviada para setor."})
        if unit.status == BloodUnit.UnitStatus.RESERVED and unit.reserved_for_id == recipient.id:
            return Response(BloodUnitSerializer(instance=unit).data, status=status.HTTP_200_OK)

        unit.reserved_for = recipient
        unit.status = BloodUnit.UnitStatus.RESERVED
        self._save_with_validation(unit)

        BloodStockMovement(
            tenant=unit.tenant,
            unit=unit,
            source_storage=unit.storage,
            movement_type=BloodStockMovement.MovementType.RESERVE,
            performed_by=self._current_user(request),
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
        self._save_with_validation(unit)

        BloodStockMovement(
            tenant=unit.tenant,
            unit=unit,
            source_storage=unit.storage,
            movement_type=BloodStockMovement.MovementType.RELEASE,
            performed_by=self._current_user(request),
            moved_at=timezone.now(),
            reason="Liberacao de reserva",
        ).save()

        return Response(BloodUnitSerializer(instance=unit).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="aviar", url_name="aviar")
    @transaction.atomic
    def forward_to_sector(self, request, pk=None):
        unit: BloodUnit = self.get_object()
        payload = BloodUnitForwardSerializer(data=request.data or {})
        payload.is_valid(raise_exception=True)
        sector: str = payload.validated_data["sector"].strip()
        notes: str = payload.validated_data.get("notes", "")

        if unit.is_expired or unit.status in {BloodUnit.UnitStatus.EXPIRED, BloodUnit.UnitStatus.DISCARDED}:
            raise ValidationError({"status": "Unidade expirada/descartada nao pode ser aviada."})
        if unit.status == BloodUnit.UnitStatus.TRANSFUSED:
            raise ValidationError({"status": "Unidade ja foi transfundida."})
        if unit.status == BloodUnit.UnitStatus.QUARANTINE:
            raise ValidationError({"status": "Unidade em quarentena nao pode ser aviada."})
        if unit.status == BloodUnit.UnitStatus.FORWARDED:
            raise ValidationError({"status": "Unidade já foi aviada para um setor."})

        now = timezone.now()
        unit.status = BloodUnit.UnitStatus.FORWARDED
        unit.forwarded_to_sector = sector
        unit.forwarded_at = now
        unit.forwarded_by = self._current_user(request)
        unit.dispatch_outcome = BloodUnit.DispatchOutcome.PENDING
        unit.dispatch_outcome_at = None
        unit.dispatch_outcome_by = None
        unit.dispatch_outcome_notes = ""
        if notes:
            unit.notes = (f"{unit.notes}\n{notes}" if unit.notes else notes).strip()
        self._save_with_validation(unit)

        BloodStockMovement(
            tenant=unit.tenant,
            unit=unit,
            source_storage=unit.storage,
            movement_type=BloodStockMovement.MovementType.FORWARD,
            performed_by=self._current_user(request),
            moved_at=now,
            reason=f"Aviada para o setor {sector}",
            notes=notes,
        ).save()

        return Response(BloodUnitSerializer(instance=unit).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="registrar_desfecho_aviacao", url_name="registrar-desfecho-aviacao")
    @transaction.atomic
    def register_dispatch_outcome(self, request, pk=None):
        unit: BloodUnit = self.get_object()
        payload = BloodUnitDispatchOutcomeSerializer(data=request.data or {})
        payload.is_valid(raise_exception=True)

        if unit.status != BloodUnit.UnitStatus.FORWARDED:
            raise ValidationError({"status": "Apenas unidades aviadas podem receber desfecho."})

        outcome = payload.validated_data["outcome"]
        recipient: Patient | None = payload.validated_data.get("recipient")
        indication: str = payload.validated_data.get("indication", "")
        notes: str = payload.validated_data.get("notes", "")
        now = timezone.now()
        user = self._current_user(request)
        transfusion = None

        if outcome == BloodUnit.DispatchOutcome.RETURNED:
            unit.status = BloodUnit.UnitStatus.AVAILABLE
            unit.reserved_for = None
            movement_type = BloodStockMovement.MovementType.RETURN
            movement_kwargs = {"destination_storage": unit.storage}
            reason = "Unidade devolvida ao banco de sangue"
        elif outcome == BloodUnit.DispatchOutcome.DISCARDED:
            unit.status = BloodUnit.UnitStatus.DISCARDED
            unit.reserved_for = None
            movement_type = BloodStockMovement.MovementType.DISCARD
            movement_kwargs = {"source_storage": unit.storage}
            reason = "Unidade descartada após aviação"
        else:
            assert recipient is not None
            transfusion, _ = self._create_completed_transfusion(
                unit=unit,
                recipient=recipient,
                user=user,
                indication=indication,
                notes=notes,
            )
            unit.reserved_for = recipient
            unit.status = BloodUnit.UnitStatus.TRANSFUSED
            movement_type = BloodStockMovement.MovementType.OUTBOUND
            movement_kwargs = {"source_storage": unit.storage}
            reason = "Transfusão após aviação"

        unit.dispatch_outcome = outcome
        unit.dispatch_outcome_at = now
        unit.dispatch_outcome_by = user
        unit.dispatch_outcome_notes = notes
        self._save_with_validation(unit)

        BloodStockMovement(
            tenant=unit.tenant,
            unit=unit,
            movement_type=movement_type,
            performed_by=user,
            moved_at=now,
            reason=reason,
            notes=notes,
            **movement_kwargs,
        ).save()

        response_payload = {"unit": BloodUnitSerializer(instance=unit).data}
        if transfusion is not None:
            response_payload["transfusion"] = BloodTransfusionSerializer(instance=transfusion).data
        return Response(response_payload, status=status.HTTP_200_OK)

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
        if unit.status == BloodUnit.UnitStatus.QUARANTINE:
            raise ValidationError({"status": "Unidade em quarentena nao pode ser transfundida."})
        if unit.status == BloodUnit.UnitStatus.RESERVED and unit.reserved_for_id != recipient.id:
            raise ValidationError({"reserved_for": "Unidade reservada para outro paciente."})

        transfusion, now = self._create_completed_transfusion(
            unit=unit,
            recipient=recipient,
            user=self._current_user(request),
            indication=indication,
            notes=notes,
        )

        unit.reserved_for = recipient
        unit.status = BloodUnit.UnitStatus.TRANSFUSED
        unit.dispatch_outcome = BloodUnit.DispatchOutcome.TRANSFUSED
        unit.dispatch_outcome_at = now
        unit.dispatch_outcome_by = self._current_user(request)
        unit.dispatch_outcome_notes = notes
        self._save_with_validation(unit)

        BloodStockMovement(
            tenant=unit.tenant,
            unit=unit,
            source_storage=unit.storage,
            movement_type=BloodStockMovement.MovementType.OUTBOUND,
            performed_by=self._current_user(request),
            moved_at=now,
            reason="Transfusao",
            notes=notes,
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

    def create(self, request, *args, **kwargs):
        raise MethodNotAllowed("POST", detail="Movimento de stock é gerado automaticamente pelo fluxo operacional.")

    def update(self, request, *args, **kwargs):
        raise MethodNotAllowed("PUT", detail="Movimento de stock não pode ser alterado manualmente.")

    def partial_update(self, request, *args, **kwargs):
        raise MethodNotAllowed("PATCH", detail="Movimento de stock não pode ser alterado manualmente.")

    def destroy(self, request, *args, **kwargs):
        raise MethodNotAllowed("DELETE", detail="Movimento de stock não pode ser removido manualmente.")


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

