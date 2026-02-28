from aplicativos.seguradora.modelos.seguradora import Seguradora


class CriarSeguradoraUseCase:

    @staticmethod
    def executar(**dados):
        return Seguradora.objects.create(**dados)
