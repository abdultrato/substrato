from apps.clinical.models import LabRequestItem
from domain.clinical.regras_requisicao import CalculadoraRequisicao


class AdicionarItemRequisicao:
    @staticmethod
    def executar(requisicao, exame, preco, quantidade):
        item, _ = LabRequestItem.objects.update_or_create(
            requisicao=requisicao,
            exame=exame,
            defaults={
                "preco_unitario": preco,
                "quantidade": quantidade,
            },
        )

        total = CalculadoraRequisicao.calcular_total(requisicao)

        return item, total
