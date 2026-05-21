from rest_framework import serializers  # DRF base

from api.v1.compat import LegacyAliasSerializerMixin
from apps.maternity.models.pregnancy import Pregnancy

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

PREGNANCY_ALIASES = {
    "id_custom": "custom_id",
    "paciente": "patient",
    "gestante": "patient",
    "gravida": "patient",
    "grávida": "patient",
    "mulher": "patient",
    "medico_responsavel": "responsible_doctor",
    "médico_responsável": "responsible_doctor",
    "ginecologista": "responsible_doctor",
    "doctor": "responsible_doctor",
    "responsavel": "responsible_doctor",
    "responsável": "responsible_doctor",
    "dum": "last_menstrual_period_date",
    "data_ultima_menstruacao": "last_menstrual_period_date",
    "data_última_menstruação": "last_menstrual_period_date",
    "data_da_ultima_menstruacao": "last_menstrual_period_date",
    "data_da_última_menstruação": "last_menstrual_period_date",
    "ultima_menstruacao": "last_menstrual_period_date",
    "última_menstruação": "last_menstrual_period_date",
    "lmp": "last_menstrual_period_date",
    "dpp": "expected_delivery_date",
    "data_prevista_parto": "expected_delivery_date",
    "data_prevista_do_parto": "expected_delivery_date",
    "previsao_parto": "expected_delivery_date",
    "previsão_parto": "expected_delivery_date",
    "due_date": "expected_delivery_date",
    "bercario": "nursery",
    "berçário": "nursery",
    "ala": "nursery",
    "enfermaria": "nursery",
    "ward": "nursery",
    "cama": "maternity_bed",
    "leito": "maternity_bed",
    "bed": "maternity_bed",
    "partos_totais": "total_deliveries",
    "total_partos": "total_deliveries",
    "total_de_partos": "total_deliveries",
    "partos_normais": "normal_deliveries",
    "partos_vaginais": "normal_deliveries",
    "cesarianas": "cesareans",
    "cesareas": "cesareans",
    "cesáreas": "cesareans",
    "c_sections": "cesareans",
    "estado": "status",
    "situacao": "status",
    "situação": "status",
    "observacoes": "notes",
    "observações": "notes",
    "notas": "notes",
}


class PregnancySerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = PREGNANCY_ALIASES
    legacy_output_aliases = PREGNANCY_ALIASES

    patient_name = serializers.CharField(source="patient.name", read_only=True)
    doctor_name = serializers.SerializerMethodField(method_name="get_doctor_name")

    class Meta:
        model = Pregnancy
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "patient_name", "doctor_name")

    def get_doctor_name(self, obj: Pregnancy) -> str:
        doctor = getattr(obj, "responsible_doctor", None)
        if not doctor:
            return ""
        return getattr(doctor, "name", "") or ""


SERIALIZER_MAP = {
    "gestacao": PregnancySerializer,
}

