from backend.frontend.api.views.permissions import (
    IsAdmin,
    IsAdminTech,
    IsCleaningTech,
    IsLabTechnician,
    IsMedico,
    IsNurse,
    IsPharmacyTech,
    IsRecepcionista,
)
from frontend.api.serializers.exame import (
    ExameCreateSerializer as ecs,
    ExameListSerializer as els,
    ExameSerializer as es,
)
from frontend.api.viewsets.base_viewset import BaseModelViewSet as bmvs
from frontend.api.viewsets.filters import (
    ExameOrderingFilter as eof,
    ExameSearchFilter as esf,
)
from frontend.billing.models.exame import Exame as e


class ExameViewSet(bmvs):
    queryset = e.objects.prefetch_related("campos").all()
    filter_backends = [esf, eof]
    search_fields = ["nome", "codigo"]
    ordering_fields = ["nome", "preco"]
    ordering = ["nome"]

    def get_serializer_class(self):
        if self.action == "list":
            return els
        if self.action in ["create", "update", "partial_update"]:
            return ecs
        return es

    def get_permissions(self):
        if self.action in ["create", "update", "destroy", "partial_update"]:
            return [IsAdmin()]
        return [
            IsAdmin(),
            IsAdminTech(),
            IsLabTechnician(),
            IsNurse(),
            IsPharmacyTech(),
            IsRecepcionista(),
            IsMedico(),
            IsCleaningTech(),
        ]
