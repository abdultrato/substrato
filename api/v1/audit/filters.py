import django_filters

from api.core.filters import SafeFilterSet
from apps.audit_activities.models.user_activity import UserActivity
from apps.identity.models.user import User


class UsuarioAuditoriaFilter(SafeFilterSet):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "is_active",
            "last_login",
        ]


class AtividadeUsuarioFilter(SafeFilterSet):
    inicio = django_filters.DateTimeFilter(field_name="criado_em", lookup_expr="gte")
    fim = django_filters.DateTimeFilter(field_name="criado_em", lookup_expr="lte")

    class Meta:
        model = UserActivity
        fields = [
            "usuario",
            "metodo",
            "caminho",
            "status_code",
            "view_basename",
            "view_action",
            "objeto_id",
            "criado_em",
        ]


FILTER_MAP = {
    "usuarios": UsuarioAuditoriaFilter,
    "atividade": AtividadeUsuarioFilter,
}
