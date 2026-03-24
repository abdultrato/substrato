from rest_framework import serializers

from apps.audit_activities.models.user_activity import UserActivity
from apps.identity.models.user import User


class UserAuditSerializer(serializers.ModelSerializer):
    nome = serializers.SerializerMethodField(method_name="get_full_name")
    grupos = serializers.SerializerMethodField(method_name="get_group_names")

    # anotados no queryset
    total_atividades = serializers.IntegerField(read_only=True)
    ultima_atividade_em = serializers.DateTimeField(read_only=True)

    class Meta:
        model = User
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

    def get_full_name(self, obj: User) -> str:
        try:
            return (obj.get_full_name() or "").strip() or obj.username
        except Exception:
            return obj.username

    def get_group_names(self, obj: User) -> list[str]:
        try:
            return list(obj.groups.values_list("name", flat=True))
        except Exception:
            return []


class UserActivitySerializer(serializers.ModelSerializer):
    usuario_nome = serializers.SerializerMethodField(method_name="get_user_name")

    class Meta:
        model = UserActivity
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

    def get_user_name(self, obj: UserActivity) -> str:
        user = getattr(obj, "usuario", None)
        if not user:
            return ""
        try:
            return (user.get_full_name() or "").strip() or user.username
        except Exception:
            return getattr(user, "username", "")


SERIALIZER_MAP = {
    "usuarios": UserAuditSerializer,
    "atividade": UserActivitySerializer,
}
