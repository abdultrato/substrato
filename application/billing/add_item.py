from django.db import transaction

from apps.billing.models.item_fatura import ItemFatura
from domain.billing.calculos import calcular_total_fatura


@transaction.atomic
def add_invoice_item(fatura, descricao, quantidade, preco):

    item = ItemFatura.objects.create(
        fatura=fatura,
        descricao=descricao,
        quantidade=quantidade,
        preco_unitario=preco,
        subtotal=quantidade * preco,
    )

    calcular_total_fatura(fatura)

    return item


adicionar_item_fatura = add_invoice_item
