from api.core.filters import SafeFilterSet

from aplicativos.identidade.modelos.password_reset import PasswordResetToken
from aplicativos.identidade.modelos.perfil import PerfilProfissional
from aplicativos.identidade.modelos.usuario import Usuario

class PasswordResetTokenFilter(SafeFilterSet):
    class Meta:
        model = PasswordResetToken
        fields = ['user', 'token', 'criado_em', 'usado']

class PerfilProfissionalFilter(SafeFilterSet):
    class Meta:
        model = PerfilProfissional
        fields = ['usuario', 'cargo', 'registro_profissional', 'departamento', 'ativo', 'criado_em', 'atualizado_em']

class UsuarioFilter(SafeFilterSet):
    class Meta:
        model = Usuario
        fields = ['password', 'last_login', 'is_superuser', 'first_name', 'last_name', 'is_staff', 'is_active', 'date_joined', 'email', 'telefone', 'ativo', 'data_criacao']

FILTER_MAP = {
    'passwordresettoken': PasswordResetTokenFilter,
    'perfilprofissional': PerfilProfissionalFilter,
    'usuario': UsuarioFilter,
}
