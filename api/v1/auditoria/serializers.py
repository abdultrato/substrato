from rest_framework import serializers

from aplicativos.auditoria_atividades.modelos.atividade_usuario import AtividadeUsuario
from aplicativos.identidade.modelos.usuario import Usuario


class UsuarioAuditoriaSerializer(serializers.ModelSerializer):
    nome = serializers.SerializerMethodField()
    grupos = serializers.SerializerMethodField()

    # anotados no queryset
    total_atividades = serializers.IntegerField(read_only=True)
    ultima_atividade_em = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Usuario
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "nome",
            "grupos",
            "total_atividades",
            "ultima_atividade_em",
        ]

    def get_nome(self, obj):
        try:
            return (obj.get_full_name() or "").strip() or obj.username
        except Exception:
            return obj.username

    def get_grupos(self, obj):
        try:
            return list(obj.groups.values_list("name", flat=True))
        except Exception:
            return []


class AtividadeUsuarioSerializer(serializers.ModelSerializer):
    usuario_nome = serializers.SerializerMethodField()

    class Meta:
        model = AtividadeUsuario
        fields = [
            "id",
            "criado_em",
            "usuario",
            "usuario_nome",
            "metodo",
            "caminho",
            "path_completo",
            "status_code",
            "duracao_ms",
            "ip",
            "user_agent",
            "view_basename",
            "view_action",
            "objeto_id",
            "mensagem",
            "metadata",
        ]

    def get_usuario_nome(self, obj):
        u = getattr(obj, "usuario", None)
        if not u:
            return ""
        try:
            return (u.get_full_name() or "").strip() or u.username
        except Exception:
            return getattr(u, "username", "")


SERIALIZER_MAP = {
    "usuarios": UsuarioAuditoriaSerializer,
    "atividade": AtividadeUsuarioSerializer,
}

