from rest_framework import serializers

from aplicativos.monitoramento.modelos.erro_sistema import ErroSistema


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


class ErroSistemaSerializer(serializers.ModelSerializer):
    usuario_nome = serializers.SerializerMethodField()

    class Meta:
        model = ErroSistema
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS + ("usuario_nome",)

    def get_usuario_nome(self, obj: ErroSistema) -> str:
        u = getattr(obj, "usuario", None)
        if not u:
            return ""
        try:
            return (u.get_full_name() or "").strip() or u.username
        except Exception:
            return getattr(u, "username", "")


SERIALIZER_MAP = {
    "erro": ErroSistemaSerializer,
}
