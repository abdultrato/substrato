from api.core.filters import SafeFilterSet
from apps.monitoring.models.system_error import SystemError


class SystemErrorFilter(SafeFilterSet):
    class Meta:
        model = SystemError
        fields = [
            "usuario",
            "status_code",
            "exception_class",
            "caminho",
            "view_basename",
            "view_action",
            "criado_em",
        ]


FILTER_MAP = {
    "erro": SystemErrorFilter,
}

ErroSistemaFilter = SystemErrorFilter
