from api.core.filters import SafeFilterSet
from apps.monitoring.models.system_error import SystemError


class SystemErrorFilter(SafeFilterSet):
    class Meta:
        model = SystemError
        fields = [
            "user",
            "status_code",
            "exception_class",
            "path",
            "view_basename",
            "view_action",
            "created_at",
        ]


FILTER_MAP = {
    "error": SystemErrorFilter,
}

ErroSistemaFilter = SystemErrorFilter
