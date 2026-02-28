from rest_framework import serializers

from aplicativos.identidade.modelos.password_reset import PasswordResetToken
from aplicativos.identidade.modelos.perfil import PerfilProfissional
from aplicativos.identidade.modelos.usuario import Usuario

class PasswordResetTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = PasswordResetToken
        fields = '__all__'

class PerfilProfissionalSerializer(serializers.ModelSerializer):
    class Meta:
        model = PerfilProfissional
        fields = '__all__'

class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = '__all__'

SERIALIZER_MAP = {
    'passwordresettoken': PasswordResetTokenSerializer,
    'perfilprofissional': PerfilProfissionalSerializer,
    'usuario': UsuarioSerializer,
}
