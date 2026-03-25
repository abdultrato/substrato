from apps.identity.models.user import User


def register_user(data):
    return User.objects.create_user(**data)


def deactivate_user(user):
    user.active = False
    user.save(update_fields=["active"])
