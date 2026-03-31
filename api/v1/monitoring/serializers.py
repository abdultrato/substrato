from rest_framework import serializers  # DRF base

from apps.monitoring.models.system_error import SystemError

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


class SystemErrorSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField(method_name="get_user_name")
    ip = serializers.CharField(read_only=True, allow_blank=True, allow_null=True)

    class Meta:
        model = SystemError
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "user_name")

    def get_user_name(self, obj: SystemError) -> str:
        u = getattr(obj, "user", None)
        if not u:
            return ""
        try:
            return (u.get_full_name() or "").strip() or u.username
        except Exception:
            return getattr(u, "username", "")


SERIALIZER_MAP = {
    "error": SystemErrorSerializer,
}

