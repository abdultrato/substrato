from rest_framework import serializers  # DRF base

from api.v1.compat import LegacyAliasSerializerMixin
from apps.medical_records.models.medical_record_entry import MedicalRecordEntry
from apps.medical_records.models.prescription_item import PrescriptionItem

CORE_READ_ONLY_FIELDS = (
    "id",
    "custom_id",
    "tenant",
    "created_by",
    "updated_by",
    "created_at",
    "updated_at",
    "deleted",
    "deleted_at",
    "deleted_by",
    "version",
)

BASE_ALIASES = {
    "id_custom": "custom_id",
    "estado": "status",
    "situacao": "status",
    "situação": "status",
    "observacoes": "notes",
    "observações": "notes",
    "notas": "notes",
}

MEDICAL_RECORD_ALIASES = {
    **BASE_ALIASES,
    "paciente": "patient",
    "utente": "patient",
    "doente": "patient",
    "patient": "patient",
    "medico": "doctor",
    "médico": "doctor",
    "doutor": "doctor",
    "doctor": "doctor",
    "profissional": "doctor",
    "consulta": "consultations",
    "consultas": "consultations",
    "appointments": "consultations",
    "inicio_atendimento": "care_start_at",
    "início_atendimento": "care_start_at",
    "inicio_do_atendimento": "care_start_at",
    "início_do_atendimento": "care_start_at",
    "care_start": "care_start_at",
    "fim_atendimento": "care_end_at",
    "fim_do_atendimento": "care_end_at",
    "care_end": "care_end_at",
    "sintoma": "symptoms",
    "sintomas": "symptoms",
    "queixa": "symptoms",
    "queixas": "symptoms",
    "symptoms": "symptoms",
    "diagnostico": "diagnosis",
    "diagnóstico": "diagnosis",
    "hipotese_diagnostica": "diagnosis",
    "hipótese_diagnóstica": "diagnosis",
    "diagnosis": "diagnosis",
    "prescricao": "prescription",
    "prescrição": "prescription",
    "receita": "prescription",
    "relatorio_medico": "medical_report",
    "relatório_médico": "medical_report",
    "relatorio": "medical_report",
    "relatório": "medical_report",
}

PRESCRIPTION_ITEM_ALIASES = {
    **BASE_ALIASES,
    "cardex": "record",
    "prontuario": "record",
    "prontuário": "record",
    "registro": "record",
    "registo": "record",
    "record": "record",
    "medicamento": "medication",
    "medicacao": "medication",
    "medicação": "medication",
    "produto": "medication",
    "medication": "medication",
    "dosagem": "dosage_value",
    "dose": "dosage_value",
    "valor_dosagem": "dosage_value",
    "unidade": "dosage_unit",
    "unidade_dosagem": "dosage_unit",
    "unidade_da_dosagem": "dosage_unit",
    "intervalo_horas": "interval_hours",
    "intervalo": "interval_hours",
    "intervalo_entre_doses": "interval_hours",
    "numero_doses": "dose_count",
    "número_doses": "dose_count",
    "doses": "dose_count",
    "quantidade_doses": "dose_count",
    "posicao": "position",
    "posição": "position",
    "ordem": "position",
}


class PrescriptionItemSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = PRESCRIPTION_ITEM_ALIASES
    legacy_output_aliases = PRESCRIPTION_ITEM_ALIASES

    medication_name = serializers.CharField(source="medication.name", read_only=True)

    class Meta:
        model = PrescriptionItem
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "medication_name")


class MedicalRecordEntrySerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = MEDICAL_RECORD_ALIASES
    legacy_output_aliases = {
        **MEDICAL_RECORD_ALIASES,
        "consultations_codigos": "consultation_codes",
        "itens_prescription": "prescription_items",
    }

    patient_name = serializers.CharField(source="patient.name", read_only=True)
    doctor_name = serializers.SerializerMethodField(method_name="get_doctor_name")
    consultation_codes = serializers.SerializerMethodField(method_name="get_consultation_codes")

    prescription_items = PrescriptionItemSerializer(source="itens_prescription", many=True, read_only=True)

    class Meta:
        model = MedicalRecordEntry
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "patient_name",
            "doctor_name",
            "consultation_codes",
            "prescription_items",
        )

    def get_doctor_name(self, obj: MedicalRecordEntry) -> str:
        doctor = getattr(obj, "doctor", None)
        if not doctor:
            return ""
        return getattr(doctor, "name", "") or ""

    def get_consultation_codes(self, obj: MedicalRecordEntry) -> list[str]:
        try:
            return list(obj.consultations.values_list("custom_id", flat=True))
        except Exception:
            return []


SERIALIZER_MAP = {
    "record": MedicalRecordEntrySerializer,
    "prescricaoitem": PrescriptionItemSerializer,
}

