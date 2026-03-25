from apps.identity.models.user import User


def register_user(dados):
    return User.objects.create_user(**dados)


def deactivate_user(user):
    user.active = False
    user.save(update_fields=["active"])


registrar_user = register_user
desativar_user = deactivate_user
