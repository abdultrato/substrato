from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.medical_records.models.medical_record_entry import MedicalRecordEntry
from apps.medical_records.models.prescription_item import PrescriptionItem

from ..filters import MedicalRecordEntryFilter, PrescriptionItemFilter
from ..serializers import MedicalRecordEntrySerializer, PrescricaoItemSerializer


class MedicalRecordEntryViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = MedicalRecordEntry.objects.select_related("paciente", "medico").prefetch_related("consultas").all()
    serializer_class = MedicalRecordEntrySerializer
    filterset_class = MedicalRecordEntryFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "id_custom",
        "paciente__nome",
        "medico__nome",
        "diagnostico",
        "sintomas",
    ]
    ordering_fields = ["inicio_atendimento", "fim_atendimento", "criado_em", "estado"]
    ordering = ["-inicio_atendimento", "-criado_em"]


class PrescriptionItemViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = PrescriptionItem.objects.select_related("registro", "medicacao").all()
    serializer_class = PrescricaoItemSerializer
    filterset_class = PrescriptionItemFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["id_custom", "medicacao__nome", "observacoes"]
    ordering_fields = ["criado_em", "dosagem_valor", "numero_doses"]
    ordering = ["-criado_em"]


VIEWSET_MAP = {
    "registro": MedicalRecordEntryViewSet,
    "prescricaoitem": PrescriptionItemViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "MedicalRecordEntryViewSet",
    "PrescriptionItemViewSet",
]

RegistroProntuarioViewSet = MedicalRecordEntryViewSet
PrescricaoItemViewSet = PrescriptionItemViewSet
