from rest_framework import serializers

from aplicativos.maternidade.modelos.gestacao import Gestacao


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


class GestacaoSerializer(serializers.ModelSerializer):
    paciente_nome = serializers.CharField(source="paciente.nome", read_only=True)
    medico_nome = serializers.SerializerMethodField()

    class Meta:
        model = Gestacao
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS + (
            "paciente_nome",
            "medico_nome",
        )

    def get_medico_nome(self, obj):
        u = getattr(obj, "medico_responsavel", None)
        if not u:
            return ""
        try:
            return (u.get_full_name() or "").strip() or u.username
        except Exception:
            return getattr(u, "username", "")


SERIALIZER_MAP = {
    "gestacao": GestacaoSerializer,
}
