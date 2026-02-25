from rest_framework.permissions import IsAuthenticated as ia

from frontend.api.serializers.entidade import (
    EntidadeCreateSerializer as ecs,
    EntidadeListSerializer as els,
    EntidadeSerializer as es,
)
from frontend.api.views.permissions import (
    IsAdmin,
    IsAdminTech,
)
from frontend.api.viewsets.base_viewset import ModelViewSet as mvs
from frontend.api.viewsets.filters import (
    OrderingFilter as of,
    SearchFilter as sf,
)
from frontend.billing.models import Entidade


class EntidadeViewSet(mvs):
    queryset = Entidade.objects.all()

    filter_backends = [sf, of]
    search_fields = ["nome", "nuit"]
    ordering_fields = ["nome", "criado_em"]
    ordering = ["nome"]

    def get_serializer_class(self):
        if self.action == "list":
            return els

        if self.action in ["create", "update", "partial_update"]:
            return ecs

        return es

    def get_permissions(self):
        """
        Permissões corporativas:
        - Admin: CRUD completo
        - Técnico Administrativo: leitura
        """

        if self.action in ["create", "update", "partial_update", "destroy"]:
            permission_classes = [IsAdmin]

        elif self.action in ["list", "retrieve"]:
            permission_classes = [IsAdmin | IsAdminTech]

        else:
            permission_classes = [ia]

        return [permission() for permission in permission_classes]
