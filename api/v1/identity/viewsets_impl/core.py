from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.identity.models.password_reset_token import PasswordResetToken
from apps.identity.models.professional_profile import ProfessionalProfile
from apps.identity.models.user import User

from ..filters import PasswordResetTokenFilter, ProfessionalProfileFilter, UserFilter
from ..serializers import PasswordResetTokenSerializer, ProfessionalProfileSerializer, UserSerializer


class PasswordResetTokenViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = PasswordResetToken.objects.all()
    serializer_class = PasswordResetTokenSerializer
    filterset_class = PasswordResetTokenFilter
    permission_classes = [IsAuthenticated]
    search_fields = []
    ordering_fields = ["user", "token", "criado_em", "usado"]
    ordering = ["-criado_em"]


class ProfessionalProfileViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = ProfessionalProfile.objects.all()
    serializer_class = ProfessionalProfileSerializer
    filterset_class = ProfessionalProfileFilter
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


class UserViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    filterset_class = UserFilter
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
    "perfilprofissional": ProfessionalProfileViewSet,
    "usuario": UserViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "PasswordResetTokenViewSet",
    "ProfessionalProfileViewSet",
    "UserViewSet",
]

PerfilProfissionalViewSet = ProfessionalProfileViewSet
UsuarioViewSet = UserViewSet
