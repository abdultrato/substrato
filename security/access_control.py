def user_can_access(user, resource):
    if not user or not user.is_authenticated:
        return False

    if user.is_superuser:
        return True

    return getattr(resource, "tenant_id", None) == getattr(user, "tenant_id", None)


user_pode_acessar = user_can_access
