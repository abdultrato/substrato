def usuario_pode_acessar(usuario, recurso):
    if usuario.is_superuser:
        return True

    return recurso.inquilino_id == usuario.inquilino_id
