from django.db import transaction

from aplicativos.faturamento.modelos.item_fatura import ItemFatura
from dominio.faturamento.calculos import calcular_total_fatura


@transaction.atomic
def adicionar_item_fatura(fatura, descricao, quantidade, preco):

    item = ItemFatura.objects.create(
        fatura=fatura,
        descricao=descricao,
        quantidade=quantidade,
        preco_unitario=preco,
        subtotal=quantidade * preco,
    )

    calcular_total_fatura(fatura)

    return item
