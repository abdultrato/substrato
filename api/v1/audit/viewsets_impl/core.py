"""ViewSets read-only da API v1 para auditoria de atividades e resumo por usuário."""

from django.db.models import Count, Max, Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ReadOnlyModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.audit_activities.models.user_activity import UserActivity
from apps.identity.models.user import User

from ..filters import UserActivityFilter, UserAuditFilter
from ..serializers import UserActivitySerializer, UserAuditSerializer


class UserAuditViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ReadOnlyModelViewSet):
    """
    Lista usuários com contagem e última actividade registrada.
    """

    queryset = User.objects.all()
    serializer_class = UserAuditSerializer
    filterset_class = UserAuditFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["username", "first_name", "last_name"]
    ordering_fields = ["username", "first_name", "last_name", "last_login"]
    ordering = ["username"]

    def get_queryset(self):
        qs = super().get_queryset()
        return qs.annotate(
            total_atividades=Count(
                "auditoria_atividades",
                filter=Q(auditoria_atividades__deleted=False),
            ),
            ultima_atividade_em=Max(
                "auditoria_atividades__created_at",
                filter=Q(auditoria_atividades__deleted=False),
            ),
        )


class UserActivityViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ReadOnlyModelViewSet):
    """Trilha de auditoria — read-only/imutável (§27.6, §27.30): nunca criada/editada/apagada via API."""

    queryset = UserActivity.objects.select_related("user").all()
    serializer_class = UserActivitySerializer
    filterset_class = UserActivityFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "path",
        "full_path",
        "user__username",
        "user__first_name",
        "user__last_name",
        "message",
    ]
    ordering_fields = [
        "created_at",
        "status_code",
        "duration_ms",
        "method",
        "path",
        "view_basename",
        "view_action",
    ]
    ordering = ["-created_at", "-id"]


VIEWSET_MAP = {
    "usuarios": UserAuditViewSet,
    "atividade": UserActivityViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "UserActivityViewSet",
    "UserAuditViewSet",
]
