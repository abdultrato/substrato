from api.core.filters import SafeFilterSet
from apps.identity.models.password_reset_token import PasswordResetToken
from apps.identity.models.professional_profile import ProfessionalProfile
from apps.identity.models.user import User


class PasswordResetTokenFilter(SafeFilterSet):
    class Meta:
        model = PasswordResetToken
        fields = ["user", "token", "criado_em", "usado"]


class ProfessionalProfileFilter(SafeFilterSet):
    class Meta:
        model = ProfessionalProfile
        fields = ["usuario", "cargo", "registro_profissional", "departamento", "ativo", "criado_em", "atualizado_em"]


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
            "telefone",
            "ativo",
            "data_criacao",
        ]


FILTER_MAP = {
    "passwordresettoken": PasswordResetTokenFilter,
    "perfilprofissional": ProfessionalProfileFilter,
    "usuario": UserFilter,
}

PerfilProfissionalFilter = ProfessionalProfileFilter
UsuarioFilter = UserFilter
