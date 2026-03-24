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
                filter=Q(auditoria_atividades__deletado=False),
            ),
            ultima_atividade_em=Max(
                "auditoria_atividades__criado_em",
                filter=Q(auditoria_atividades__deletado=False),
            ),
        )


class UserActivityViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ReadOnlyModelViewSet):
    queryset = UserActivity.objects.select_related("usuario").all()
    serializer_class = UserActivitySerializer
    filterset_class = UserActivityFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "caminho",
        "path_completo",
        "usuario__username",
        "usuario__first_name",
        "usuario__last_name",
        "mensagem",
    ]
    ordering_fields = [
        "criado_em",
        "status_code",
        "duracao_ms",
        "metodo",
        "caminho",
        "view_basename",
        "view_action",
    ]
    ordering = ["-criado_em", "-id"]


VIEWSET_MAP = {
    "usuarios": UserAuditViewSet,
    "atividade": UserActivityViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "UserActivityViewSet",
    "UserAuditViewSet",
]
