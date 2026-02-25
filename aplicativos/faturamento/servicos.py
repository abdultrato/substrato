from .modelos.fatura import Fatura
from .modelos.item_fatura import ItemFatura
from .calculos import calcular_total_fatura

class ServicoFaturamento:

    def criar_fatura(self, paciente):
        return Fatura.objects.create(paciente=paciente)

    def adicionar_item(self, fatura, descricao, quantidade, preco):
        item = ItemFatura.objects.create(
            fatura=fatura,
            descricao=descricao,
            quantidade=quantidade,
            preco_unitario=preco,
            subtotal=quantidade * preco,
        )
        calcular_total_fatura(fatura)
        return item
