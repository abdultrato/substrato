def usuario_pode_acessar(usuario, recurso):

    if not usuario or not usuario.is_authenticated:
        return False

    if usuario.is_superuser:
        return True

    return getattr(recurso, "inquilino_id", None) == getattr(usuario, "inquilino_id", None)
