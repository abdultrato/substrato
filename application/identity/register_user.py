from apps.identity.models.user import User


def register_user(dados):
    return User.objects.create_user(**dados)


def deactivate_user(usuario):
    usuario.ativo = False
    usuario.save(update_fields=["ativo"])


registrar_usuario = register_user
desativar_usuario = deactivate_user
