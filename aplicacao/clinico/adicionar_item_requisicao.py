from aplicativos.clinico.modelos import RequisicaoItem
from dominio.clinico.regras_requisicao import CalculadoraRequisicao


class AdicionarItemRequisicao:

    @staticmethod
    def executar(requisicao, exame, preco, quantidade):

        item, criado = RequisicaoItem.objects.update_or_create(
            requisicao=requisicao,
            exame=exame,
            defaults={
                "preco_unitario": preco,
                "quantidade": quantidade,
            },
        )

        total = CalculadoraRequisicao.calcular_total(requisicao)

        return item, total


from aplicativos.clinico.modelos import RequisicaoItem
from dominio.clinico.regras_requisicao import CalculadoraRequisicao


class AdicionarItemRequisicao:

    @staticmethod
    def executar(requisicao, exame, preco, quantidade):

        item, _ = RequisicaoItem.objects.update_or_create(
            requisicao=requisicao,
            exame=exame,
            defaults={
                "preco_unitario": preco,
                "quantidade": quantidade,
            },
        )

        total = CalculadoraRequisicao.calcular_total(requisicao)

        return item, total
