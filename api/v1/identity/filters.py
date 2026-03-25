from api.core.filters import SafeFilterSet
from apps.identity.models.password_reset_token import PasswordResetToken
from apps.identity.models.professional_profile import ProfessionalProfile
from apps.identity.models.user import User


class PasswordResetTokenFilter(SafeFilterSet):
    class Meta:
        model = PasswordResetToken
        fields = ["user", "token", "created_at", "used"]


class ProfessionalProfileFilter(SafeFilterSet):
    class Meta:
        model = ProfessionalProfile
        fields = ["user", "role", "professional_registration", "department", "active", "created_at", "updated_at"]


class UserFilter(SafeFilterSet):
    class Meta:
        model = User
        fields = [
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
            "active",
            "date_criacao",
        ]


FILTER_MAP = {
    "passwordresettoken": PasswordResetTokenFilter,
    "perfilprofissional": ProfessionalProfileFilter,
    "user": UserFilter,
}

PerfilProfissionalFilter = ProfessionalProfileFilter
UsuarioFilter = UserFilter
