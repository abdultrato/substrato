from rest_framework import serializers  # DRF base

from api.v1.compat import LegacyAliasSerializerMixin
from apps.identity.models.password_reset_token import PasswordResetToken
from apps.identity.models.professional_profile import ProfessionalProfile
from apps.identity.models.user import User

CORE_READ_ONLY_FIELDS = (
    "id",
    "custom_id",
    "tenant",
    "created_by",
    "updated_by",
    "created_at",
    "updated_at",
    "deleted",
    "deleted_at",
    "deleted_by",
    "version",
)


PASSWORD_RESET_TOKEN_ALIASES = {
    "utilizador": "user",
    "usuario": "user",
    "usuário": "user",
    "conta": "user",
    "token_reset": "token",
    "token_redefinicao": "token",
    "token_redefinição": "token",
    "usado": "used",
    "usada": "used",
    "utilizado": "used",
    "utilizada": "used",
}

PROFESSIONAL_PROFILE_ALIASES = {
    "utilizador": "user",
    "usuario": "user",
    "usuário": "user",
    "conta": "user",
    "funcionario": "employee",
    "funcionário": "employee",
    "colaborador": "employee",
    "cargo": "role",
    "funcao": "role",
    "função": "role",
    "perfil": "role",
    "registo_profissional": "professional_registration",
    "registro_profissional": "professional_registration",
    "cedula": "professional_registration",
    "cédula": "professional_registration",
    "cedula_profissional": "professional_registration",
    "cédula_profissional": "professional_registration",
    "departamento": "department",
    "servico": "department",
    "serviço": "department",
    "sector": "department",
    "setor": "department",
    "ativo": "active",
    "activa": "active",
    "ativa": "active",
}

USER_ALIASES = {
    "id_custom": "custom_id",
    "nome": "name",
    "nome_completo": "name",
    "utilizador": "username",
    "usuario": "username",
    "usuário": "username",
    "nome_utilizador": "username",
    "nome_de_utilizador": "username",
    "nome_usuario": "username",
    "login": "username",
    "email": "email",
    "e_mail": "email",
    "telefone": "phone",
    "contacto": "phone",
    "contato": "phone",
    "foto": "photo",
    "primeiro_nome": "first_name",
    "nome_proprio": "first_name",
    "nome_próprio": "first_name",
    "apelido": "last_name",
    "sobrenome": "last_name",
    "ultimo_nome": "last_name",
    "último_nome": "last_name",
    "senha": "password",
    "palavra_passe": "password",
    "palavra-passe": "password",
    "password": "password",
    "ativo": "is_active",
    "activa": "is_active",
    "ativa": "is_active",
    "staff": "is_staff",
    "equipa": "is_staff",
    "membro_equipa": "is_staff",
    "superutilizador": "is_superuser",
    "super_usuario": "is_superuser",
    "superusuário": "is_superuser",
    "grupos": "groups",
    "grupo": "groups",
    "perfis": "groups",
    "permissoes": "user_permissions",
    "permissões": "user_permissions",
}


class PasswordResetTokenSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = PASSWORD_RESET_TOKEN_ALIASES
    legacy_output_aliases = PASSWORD_RESET_TOKEN_ALIASES

    class Meta:
        model = PasswordResetToken
        fields = "__all__"


class ProfessionalProfileSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = PROFESSIONAL_PROFILE_ALIASES
    legacy_output_aliases = PROFESSIONAL_PROFILE_ALIASES

    class Meta:
        model = ProfessionalProfile
        fields = "__all__"


class UserSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = USER_ALIASES
    legacy_output_aliases = USER_ALIASES

    password = serializers.CharField(write_only=True, required=False, trim_whitespace=False)  # Não retorna senha

    class Meta:
        model = User
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS

    def create(self, validated_date):
        # Criação: define senha ou bloqueia login se ausente.
        password = validated_date.pop("password", None)
        user = super().create(validated_date)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(update_fields=["password"])
        return user

    def update(self, instance, validated_date):
        # Atualização: só mexe na senha se fornecida.
        password = validated_date.pop("password", None)
        user = super().update(instance, validated_date)
        if password:
            user.set_password(password)
            user.save(update_fields=["password"])
        return user


SERIALIZER_MAP = {
    "passwordresettoken": PasswordResetTokenSerializer,
    "perfilprofissional": ProfessionalProfileSerializer,
    "user": UserSerializer,
}

