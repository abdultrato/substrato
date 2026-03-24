from django.db import transaction

from apps.billing.models.invoice_items import InvoiceItem


@transaction.atomic
def add_invoice_item(fatura, descricao, quantidade, preco):
    item = InvoiceItem.objects.create(
        inquilino=fatura.inquilino,
        fatura=fatura,
        tipo_item=InvoiceItem.ItemType.AJUSTE,
        descricao=descricao,
        quantidade=quantidade,
        preco_unitario=preco,
    )
    fatura.persistir_totais()

    return item


adicionar_item_fatura = add_invoice_item
