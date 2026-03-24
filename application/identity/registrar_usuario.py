from apps.identity.models.user import User


def registrar_usuario(dados):
    return User.objects.create_user(**dados)


def desativar_usuario(usuario):
    usuario.ativo = False
    usuario.save(update_fields=["ativo"])
