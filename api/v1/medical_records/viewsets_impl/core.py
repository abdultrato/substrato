from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.medical_records.models.medical_record_entry import MedicalRecordEntry
from apps.medical_records.models.prescription_item import PrescriptionItem

from ..filters import MedicalRecordEntryFilter, PrescriptionItemFilter
from ..serializers import MedicalRecordEntrySerializer, PrescricaoItemSerializer


class MedicalRecordEntryViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = MedicalRecordEntry.objects.select_related("patient", "doctor").prefetch_related("consultations").all()
    serializer_class = MedicalRecordEntrySerializer
    filterset_class = MedicalRecordEntryFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "patient__name",
        "doctor__name",
        "diagnosis",
        "symptoms",
    ]
    ordering_fields = ["care_start_at", "care_end_at", "created_at", "status"]
    ordering = ["-care_start_at", "-created_at"]


class PrescriptionItemViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = PrescriptionItem.objects.select_related("record", "medication").all()
    serializer_class = PrescricaoItemSerializer
    filterset_class = PrescriptionItemFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "medication__name", "notes"]
    ordering_fields = ["created_at", "dosage_value", "dose_count"]
    ordering = ["-created_at"]


VIEWSET_MAP = {
    "record": MedicalRecordEntryViewSet,
    "prescricaoitem": PrescriptionItemViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "MedicalRecordEntryViewSet",
    "PrescriptionItemViewSet",
]

RegistroProntuarioViewSet = MedicalRecordEntryViewSet
PrescricaoItemViewSet = PrescriptionItemViewSet
