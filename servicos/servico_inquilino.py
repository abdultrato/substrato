from aplicativos.inquilinos.modelos import Inquilino

class ServicoInquilino:

    def criar(self, nome, dominio):
        return Inquilino.objects.create(
            nome=nome,
            identificador=dominio,
            dominio=dominio
        )
