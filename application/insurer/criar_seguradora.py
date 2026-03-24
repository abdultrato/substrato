from apps.insurer.models.insurer import Insurer


class CriarSeguradoraUseCase:
    @staticmethod
    def executar(**dados):
        return Insurer.objects.create(**dados)
