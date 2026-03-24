from rest_framework import serializers

from apps.medical_records.models.prescription_item import PrescriptionItem
from apps.medical_records.models.medical_record_entry import MedicalRecordEntry

CORE_READ_ONLY_FIELDS = (
    "id",
    "id_custom",
    "inquilino",
    "criado_por",
    "atualizado_por",
    "criado_em",
    "atualizado_em",
    "deletado",
    "deletado_em",
    "deletado_por",
    "versao",
)


class PrescricaoItemSerializer(serializers.ModelSerializer):
    medicacao_nome = serializers.CharField(source="medicacao.nome", read_only=True)

    class Meta:
        model = PrescriptionItem
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "medicacao_nome")


class RegistroProntuarioSerializer(serializers.ModelSerializer):
    paciente_nome = serializers.CharField(source="paciente.nome", read_only=True)
    medico_nome = serializers.SerializerMethodField()
    consultas_codigos = serializers.SerializerMethodField()

    itens_prescricao = PrescricaoItemSerializer(many=True, read_only=True)

    class Meta:
        model = MedicalRecordEntry
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "paciente_nome",
            "medico_nome",
            "consultas_codigos",
            "itens_prescricao",
        )

    def get_medico_nome(self, obj: MedicalRecordEntry) -> str:
        medico = getattr(obj, "medico", None)
        if not medico:
            return ""
        return getattr(medico, "nome", "") or ""

    def get_consultas_codigos(self, obj: MedicalRecordEntry) -> list[str]:
        try:
            return list(obj.consultas.values_list("id_custom", flat=True))
        except Exception:
            return []


SERIALIZER_MAP = {
    "registro": RegistroProntuarioSerializer,
    "prescricaoitem": PrescricaoItemSerializer,
}
