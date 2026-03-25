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
    ordering_fields = ["user", "token", "created_at", "used"]
    ordering = ["-created_at"]


class ProfessionalProfileViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = ProfessionalProfile.objects.all()
    serializer_class = ProfessionalProfileSerializer
    filterset_class = ProfessionalProfileFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["role", "professional_registration", "department"]
    ordering_fields = [
        "user",
        "role",
        "professional_registration",
        "department",
        "active",
        "created_at",
        "updated_at",
    ]
    ordering = ["-created_at"]


class UserViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    filterset_class = UserFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["email", "phone", "password", "first_name", "last_name"]
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
        "phone",
        # Usa `created_at` do CoreModel; `date_criacao` nao existe no model.
        "created_at",
    ]


VIEWSET_MAP = {
    "passwordresettoken": PasswordResetTokenViewSet,
    "perfilprofissional": ProfessionalProfileViewSet,
    "user": UserViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "PasswordResetTokenViewSet",
    "ProfessionalProfileViewSet",
    "UserViewSet",
]

PerfilProfissionalViewSet = ProfessionalProfileViewSet
UsuarioViewSet = UserViewSet
