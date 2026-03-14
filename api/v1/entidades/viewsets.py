from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from aplicativos.entidades.modelos.empresa import Empresa

from .filters import EmpresaFilter
from .serializers import EmpresaSerializer


class EmpresaViewSet(ModelViewSet):
    queryset = Empresa.objects.all()
    serializer_class = EmpresaSerializer
    filterset_class = EmpresaFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["id_custom", "nome", "nuit", "email", "telefone1", "telefone2"]
    ordering_fields = [
        "nome",
        "nuit",
        "ativo",
        "criado_em",
        "atualizado_em",
    ]
    ordering = ["nome"]

    def get_queryset(self):
        qs = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            qs = qs.filter(inquilino=inquilino)
        return qs


VIEWSET_MAP = {
    "empresa": EmpresaViewSet,
}

__all__ = [
    "EmpresaViewSet",
    "VIEWSET_MAP",
]

