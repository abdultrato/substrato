from apps.insurer.models.insurer import Insurer


class CreateInsurerUseCase:
    @staticmethod
    def execute(**dados):
        return Insurer.objects.create(**dados)


CriarSeguradoraUseCase = CreateInsurerUseCase
CreateInsurerUseCase.executar = CreateInsurerUseCase.execute
