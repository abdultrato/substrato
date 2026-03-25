from api.core.filters import SafeFilterSet
from apps.medical_records.models.medical_record_entry import MedicalRecordEntry
from apps.medical_records.models.prescription_item import PrescriptionItem


class MedicalRecordEntryFilter(SafeFilterSet):
    class Meta:
        model = MedicalRecordEntry
        fields = [
            "paciente",
            "medico",
            "consultas",
            "estado",
            "inicio_atendimento",
            "fim_atendimento",
            "criado_em",
        ]


class PrescriptionItemFilter(SafeFilterSet):
    class Meta:
        model = PrescriptionItem
        fields = [
            "registro",
            "medicacao",
            "dosagem_unidade",
            "numero_doses",
            "criado_em",
        ]


FILTER_MAP = {
    "registro": MedicalRecordEntryFilter,
    "prescricaoitem": PrescriptionItemFilter,
}

RegistroProntuarioFilter = MedicalRecordEntryFilter
PrescricaoItemFilter = PrescriptionItemFilter
