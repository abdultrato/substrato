from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated  # Protege endpoints
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet  # CRUD base DRF

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.identity.models.password_reset_token import PasswordResetToken
from apps.identity.models.professional_profile import ProfessionalProfile
from apps.identity.models.user import User

from ..filters import PasswordResetTokenFilter, ProfessionalProfileFilter, UserFilter
from ..serializers import PasswordResetTokenSerializer, ProfessionalProfileSerializer, UserSerializer


class PasswordResetTokenViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = PasswordResetToken.objects.all()  # Inclui soft delete handled via mixin
    serializer_class = PasswordResetTokenSerializer
    filterset_class = PasswordResetTokenFilter
    permission_classes = [IsAuthenticated]
    search_fields = []  # Busca desabilitada (tokens são sigilosos)
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

    def _set_user_active(self, user: User, active: bool):
        if user.is_active != active:
            user.is_active = active
            user.save(update_fields=["is_active"])
        return Response(self.get_serializer(user).data)

    def destroy(self, request, *args, **kwargs):
        """
        Não remove usuário: converte DELETE em desativação de conta.
        """
        user = self.get_object()
        return self._set_user_active(user, False)

    @action(detail=True, methods=["post"], url_path="desativar", url_name="desativar")
    def deactivate(self, request, pk=None):
        user = self.get_object()
        return self._set_user_active(user, False)

    @action(detail=True, methods=["post"], url_path="ativar", url_name="ativar")
    def activate(self, request, pk=None):
        user = self.get_object()
        return self._set_user_active(user, True)

    @action(detail=True, methods=["post"], url_path="deactivate", url_name="deactivate")
    def deactivate_en(self, request, pk=None):
        return self.deactivate(request, pk=pk)

    @action(detail=True, methods=["post"], url_path="activate", url_name="activate")
    def activate_en(self, request, pk=None):
        return self.activate(request, pk=pk)


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

