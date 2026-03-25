from rest_framework import serializers

from api.v1.compat import LegacyAliasSerializerMixin
from apps.audit_activities.models.user_activity import UserActivity
from apps.identity.models.user import User


class UserAuditSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    name = serializers.SerializerMethodField(method_name="get_full_name")
    groups = serializers.SerializerMethodField(method_name="get_group_names")

    # anotados no queryset
    total_activities = serializers.IntegerField(read_only=True)
    last_activity_at = serializers.DateTimeField(read_only=True)
    legacy_output_aliases = {
        "grupos": "groups",
        "total_atividades": "total_activities",
        "ultima_atividade_em": "last_activity_at",
    }

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "name",
            "groups",
            "total_activities",
            "last_activity_at",
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
    user_name = serializers.SerializerMethodField(method_name="get_user_name")
    ip = serializers.CharField(read_only=True, allow_blank=True, allow_null=True)

    class Meta:
        model = UserActivity
        fields = [
            "id",
            "created_at",
            "user",
            "user_name",
            "method",
            "path",
            "full_path",
            "status_code",
            "duration_ms",
            "ip",
            "user_agent",
            "view_basename",
            "view_action",
            "object_id",
            "message",
            "metadata",
        ]

    def get_user_name(self, obj: UserActivity) -> str:
        user = getattr(obj, "user", None)
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
