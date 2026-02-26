from aplicativos.identidade.modelos.usuario import Usuario


def registrar_usuario(dados):
    return Usuario.objects.create_user(**dados)


def desativar_usuario(usuario):
    usuario.ativo = False
    usuario.save(update_fields=["ativo"])
