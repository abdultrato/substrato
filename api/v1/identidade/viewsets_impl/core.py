from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from aplicativos.identidade.modelos.password_reset import PasswordResetToken
from aplicativos.identidade.modelos.perfil import PerfilProfissional
from aplicativos.identidade.modelos.usuario import Usuario

from ..filters import PasswordResetTokenFilter, PerfilProfissionalFilter, UsuarioFilter
from ..serializers import PasswordResetTokenSerializer, PerfilProfissionalSerializer, UsuarioSerializer


class PasswordResetTokenViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = PasswordResetToken.objects.all()
    serializer_class = PasswordResetTokenSerializer
    filterset_class = PasswordResetTokenFilter
    permission_classes = [IsAuthenticated]
    search_fields = []
    ordering_fields = ["user", "token", "criado_em", "usado"]
    ordering = ["-criado_em"]


class PerfilProfissionalViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = PerfilProfissional.objects.all()
    serializer_class = PerfilProfissionalSerializer
    filterset_class = PerfilProfissionalFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["cargo", "registro_profissional", "departamento"]
    ordering_fields = [
        "usuario",
        "cargo",
        "registro_profissional",
        "departamento",
        "ativo",
        "criado_em",
        "atualizado_em",
    ]
    ordering = ["-criado_em"]


class UsuarioViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer
    filterset_class = UsuarioFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["email", "telefone", "password", "first_name", "last_name"]
    ordering_fields = [
        "password",
        "last_login",
        "is_superuser",
        "first_name",
        "last_name",
        "is_staff",
        "is_active",
        "date_joined",
        "email",
        "telefone",
        # Usa `criado_em` do CoreModel; `data_criacao` nao existe no model.
        "criado_em",
    ]


VIEWSET_MAP = {
    "passwordresettoken": PasswordResetTokenViewSet,
    "perfilprofissional": PerfilProfissionalViewSet,
    "usuario": UsuarioViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "PasswordResetTokenViewSet",
    "PerfilProfissionalViewSet",
    "UsuarioViewSet",
]
