from rest_framework import serializers

from aplicativos.identidade.modelos.password_reset import PasswordResetToken
from aplicativos.identidade.modelos.perfil import PerfilProfissional
from aplicativos.identidade.modelos.usuario import Usuario

CORE_READ_ONLY_FIELDS = (
    "id",
    "id_custom",
    "inquilino",
    "criado_por",
    "atualizado_por",
    "criado_em",
    "atualizado_em",
    "deletado",
    "deletado_em",
    "deletado_por",
    "versao",
)


class PasswordResetTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = PasswordResetToken
        fields = "__all__"


class PerfilProfissionalSerializer(serializers.ModelSerializer):
    class Meta:
        model = PerfilProfissional
        fields = "__all__"


class UsuarioSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, trim_whitespace=False)

    class Meta:
        model = Usuario
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = super().create(validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(update_fields=["password"])
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save(update_fields=["password"])
        return user


SERIALIZER_MAP = {
    "passwordresettoken": PasswordResetTokenSerializer,
    "perfilprofissional": PerfilProfissionalSerializer,
    "usuario": UsuarioSerializer,
}
