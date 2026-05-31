from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated  # Protege endpoints
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet  # CRUD base DRF

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.identity.models.professional_profile import ProfessionalProfile
from apps.identity.models.user import User
from security.permissions.user_hierarchy import (
    can_manage_target_user,
    manageable_users_queryset,
)

from ..filters import ProfessionalProfileFilter, UserFilter
from ..serializers import ProfessionalProfileSerializer, UserSerializer


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

    def get_queryset(self):
        qs = super().get_queryset()
        actor = getattr(self.request, "user", None)
        return manageable_users_queryset(actor, qs)

    def _get_target_user_or_raise(self) -> User:
        target = self.get_object()
        actor = getattr(self.request, "user", None)
        if not can_manage_target_user(actor, target):
            raise PermissionDenied("Não autorizado a gerir este utilizador.")
        return target

    def _set_user_active(self, user: User, active: bool):
        actor = getattr(self.request, "user", None)
        if not can_manage_target_user(actor, user):
            raise PermissionDenied("Não autorizado a gerir este utilizador.")
        if user.is_active != active:
            user.is_active = active
            user.save(update_fields=["is_active"])
        return Response(self.get_serializer(user).data)

    def destroy(self, request, *args, **kwargs):
        """
        Não remove usuário: converte DELETE em desativação de conta.
        """
        user = self._get_target_user_or_raise()
        return self._set_user_active(user, False)

    def perform_update(self, serializer):
        target = serializer.instance
        actor = getattr(self.request, "user", None)
        if not can_manage_target_user(actor, target):
            raise PermissionDenied("Não autorizado a gerir este utilizador.")
        super().perform_update(serializer)

    @action(detail=True, methods=["post"], url_path="desativar", url_name="desativar")
    def deactivate(self, request, pk=None):
        user = self._get_target_user_or_raise()
        return self._set_user_active(user, False)

    @action(detail=True, methods=["post"], url_path="ativar", url_name="ativar")
    def activate(self, request, pk=None):
        user = self._get_target_user_or_raise()
        return self._set_user_active(user, True)

    @action(detail=True, methods=["post"], url_path="deactivate", url_name="deactivate")
    def deactivate_en(self, request, pk=None):
        return self.deactivate(request, pk=pk)

    @action(detail=True, methods=["post"], url_path="activate", url_name="activate")
    def activate_en(self, request, pk=None):
        return self.activate(request, pk=pk)


VIEWSET_MAP = {
    "perfilprofissional": ProfessionalProfileViewSet,
    "user": UserViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "ProfessionalProfileViewSet",
    "UserViewSet",
]

