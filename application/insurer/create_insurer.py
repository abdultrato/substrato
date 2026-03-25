from apps.insurer.models.insurer import Insurer


class CreateInsurerUseCase:
    @staticmethod
    def execute(**data):
        return Insurer.objects.create(**data)
