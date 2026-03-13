from django.db.models import Count, Max, Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ReadOnlyModelViewSet

from aplicativos.auditoria_atividades.modelos.atividade_usuario import AtividadeUsuario
from aplicativos.identidade.modelos.usuario import Usuario
from .filters import AtividadeUsuarioFilter, UsuarioAuditoriaFilter
from .serializers import AtividadeUsuarioSerializer, UsuarioAuditoriaSerializer


class UsuarioAuditoriaViewSet(ReadOnlyModelViewSet):
    """
    Lista usuários com contagem e última actividade registrada.
    """

    queryset = Usuario.objects.all()
    serializer_class = UsuarioAuditoriaSerializer
    filterset_class = UsuarioAuditoriaFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["username", "first_name", "last_name"]
    ordering_fields = ["username", "first_name", "last_name", "last_login"]
    ordering = ["username"]

    def get_queryset(self):
        qs = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            qs = qs.filter(inquilino=inquilino)

        qs = qs.annotate(
            total_atividades=Count(
                "auditoria_atividades",
                filter=Q(auditoria_atividades__deletado=False),
            ),
            ultima_atividade_em=Max(
                "auditoria_atividades__criado_em",
                filter=Q(auditoria_atividades__deletado=False),
            ),
        )
        return qs


class AtividadeUsuarioViewSet(ReadOnlyModelViewSet):
    queryset = AtividadeUsuario.objects.select_related("usuario").all()
    serializer_class = AtividadeUsuarioSerializer
    filterset_class = AtividadeUsuarioFilter
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

    def get_queryset(self):
        qs = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            qs = qs.filter(inquilino=inquilino)
        return qs


VIEWSET_MAP = {
    "usuarios": UsuarioAuditoriaViewSet,
    "atividade": AtividadeUsuarioViewSet,
}

__all__ = [
    "UsuarioAuditoriaViewSet",
    "AtividadeUsuarioViewSet",
    "VIEWSET_MAP",
]

