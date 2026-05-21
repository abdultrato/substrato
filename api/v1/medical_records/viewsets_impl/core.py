from rest_framework.permissions import IsAuthenticated  # Protege endpoints
from rest_framework.viewsets import ModelViewSet  # CRUD base DRF

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.medical_records.models.medical_record_entry import MedicalRecordEntry
from apps.medical_records.models.prescription_item import PrescriptionItem

from ..filters import MedicalRecordEntryFilter, PrescriptionItemFilter
from ..serializers import MedicalRecordEntrySerializer, PrescriptionItemSerializer


class MedicalRecordEntryViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = MedicalRecordEntry.objects.select_related("patient", "doctor").prefetch_related("consultations").all()
    serializer_class = MedicalRecordEntrySerializer
    filterset_class = MedicalRecordEntryFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "patient__name",
        "patient__document_number",
        "doctor__name",
        "doctor__document_number",
        "diagnosis",
        "symptoms",
        "prescription",
        "medical_report",
    ]
    ordering_fields = ["care_start_at", "care_end_at", "created_at", "updated_at", "status", "patient", "doctor"]
    ordering = ["-care_start_at", "-created_at"]


class PrescriptionItemViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = PrescriptionItem.objects.select_related("record", "record__patient", "medication").all()
    serializer_class = PrescriptionItemSerializer
    filterset_class = PrescriptionItemFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "record__custom_id", "record__patient__name", "medication__name", "notes"]
    ordering_fields = [
        "position",
        "created_at",
        "updated_at",
        "dosage_value",
        "dosage_unit",
        "interval_hours",
        "dose_count",
        "record",
        "medication",
    ]
    ordering = ["record", "position", "id"]


VIEWSET_MAP = {
    "record": MedicalRecordEntryViewSet,
    "prescricaoitem": PrescriptionItemViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "MedicalRecordEntryViewSet",
    "PrescriptionItemViewSet",
]

