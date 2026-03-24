from api.core.filters import SafeFilterSet
from apps.medical_records.models.prescription_item import PrescriptionItem
from apps.medical_records.models.medical_record_entry import MedicalRecordEntry


class RegistroProntuarioFilter(SafeFilterSet):
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


class PrescricaoItemFilter(SafeFilterSet):
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
    "registro": RegistroProntuarioFilter,
    "prescricaoitem": PrescricaoItemFilter,
}
