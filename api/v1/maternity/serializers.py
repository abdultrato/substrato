from rest_framework import serializers

from apps.maternity.models.pregnancy import Pregnancy

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


class PregnancySerializer(serializers.ModelSerializer):
    paciente_nome = serializers.CharField(source="paciente.nome", read_only=True)
    medico_nome = serializers.SerializerMethodField(method_name="get_doctor_name")

    class Meta:
        model = Pregnancy
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "paciente_nome", "medico_nome")

    def get_doctor_name(self, obj: Pregnancy) -> str:
        doctor = getattr(obj, "medico_responsavel", None)
        if not doctor:
            return ""
        return getattr(doctor, "nome", "") or ""


SERIALIZER_MAP = {
    "gestacao": PregnancySerializer,
}

GestacaoSerializer = PregnancySerializer
