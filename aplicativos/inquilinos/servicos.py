from .modelos import Inquilino

class ServicoInquilino:

    def criar_inquilino(self, nome, identificador, dominio):
        return Inquilino.objects.create(
            nome=nome,
            identificador=identificador,
            dominio=dominio
        )
