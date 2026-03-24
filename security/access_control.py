def user_can_access(user, resource):
    if not user or not user.is_authenticated:
        return False

    if user.is_superuser:
        return True

    return getattr(resource, "inquilino_id", None) == getattr(user, "inquilino_id", None)


usuario_pode_acessar = user_can_access
