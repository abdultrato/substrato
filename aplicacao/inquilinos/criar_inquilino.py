from aplicativos.inquilinos.modelos.inquilino import Inquilino


def criar_inquilino(nome, identificador, dominio=None):
    return Inquilino.objects.create(
        nome=nome,
        identificador=identificador,
        dominio=dominio,
    )
