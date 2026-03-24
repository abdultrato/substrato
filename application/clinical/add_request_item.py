from apps.clinical.models import LabRequestItem
from domain.clinical.request_rules import RequestCalculator


class AddRequestItem:
    @staticmethod
    def execute(requisicao, exame, preco, quantidade):
        item, _ = LabRequestItem.objects.update_or_create(
            requisicao=requisicao,
            exame=exame,
            defaults={
                "preco_unitario": preco,
                "quantidade": quantidade,
            },
        )

        total = RequestCalculator.calculate_total(requisicao)

        return item, total


AdicionarItemRequisicao = AddRequestItem
AddRequestItem.executar = AddRequestItem.execute
