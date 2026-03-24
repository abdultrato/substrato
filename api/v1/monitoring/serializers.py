from rest_framework import serializers

from apps.monitoring.models.system_error import SystemError

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


class SystemErrorSerializer(serializers.ModelSerializer):
    usuario_nome = serializers.SerializerMethodField(method_name="get_user_name")

    class Meta:
        model = SystemError
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "usuario_nome")

    def get_user_name(self, obj: SystemError) -> str:
        u = getattr(obj, "usuario", None)
        if not u:
            return ""
        try:
            return (u.get_full_name() or "").strip() or u.username
        except Exception:
            return getattr(u, "username", "")


SERIALIZER_MAP = {
    "erro": SystemErrorSerializer,
}

ErroSistemaSerializer = SystemErrorSerializer
