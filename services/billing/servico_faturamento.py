from apps.billing.models.invoice import Invoice
from apps.billing.models.item_fatura import ItemFatura
from domain.billing.calculadora_precos import calcular_subtotal


class ServicoFaturamento:
    def criar_fatura(self, paciente):
        return Invoice.objects.create(paciente=paciente)

    def adicionar_item(self, fatura, descricao, quantidade, preco):
        subtotal = calcular_subtotal(quantidade, preco)

        item = ItemFatura.objects.create(
            fatura=fatura, descricao=descricao, quantidade=quantidade, preco_unitario=preco, subtotal=subtotal
        )

        fatura.total += subtotal
        fatura.save()

        return item
