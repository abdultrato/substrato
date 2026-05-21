from api.core.filters import SafeFilterSet  # Base com saneamento
from apps.monitoring.models.system_error import SystemError


class SystemErrorFilter(SafeFilterSet):
    class Meta:
        model = SystemError
        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "deleted_at",
            "created_by",
            "updated_by",
            "user",
            "method",
            "status_code",
            "duration_ms",
            "ip",
            "user_agent",
            "exception_class",
            "path",
            "full_path",
            "view_basename",
            "view_action",
            "object_id",
            "created_at",
            "updated_at",
        ]


FILTER_MAP = {
    "error": SystemErrorFilter,
}

