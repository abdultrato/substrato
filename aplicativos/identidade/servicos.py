from .modelos import Usuario

class ServicoIdentidade:

    def registrar_usuario(self, dados):
        return Usuario.objects.create_user(**dados)

    def desativar_usuario(self, usuario):
        usuario.ativo = False
        usuario.save()
