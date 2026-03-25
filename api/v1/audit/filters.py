import django_filters

from api.core.filters import SafeFilterSet
from apps.audit_activities.models.user_activity import UserActivity
from apps.identity.models.user import User


class UserAuditFilter(SafeFilterSet):
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


class UserActivityFilter(SafeFilterSet):
    inicio = django_filters.DateTimeFilter(field_name="created_at", lookup_expr="gte")
    fim = django_filters.DateTimeFilter(field_name="created_at", lookup_expr="lte")

    class Meta:
        model = UserActivity
        fields = [
            "user",
            "method",
            "path",
            "status_code",
            "view_basename",
            "view_action",
            "object_id",
            "created_at",
        ]


FILTER_MAP = {
    "usuarios": UserAuditFilter,
    "atividade": UserActivityFilter,
}
