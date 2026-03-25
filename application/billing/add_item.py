from django.db import transaction

from apps.billing.models.invoice_items import InvoiceItem


@transaction.atomic
def add_invoice_item(invoice, description, quantity, price):
    item = InvoiceItem.objects.create(
        tenant=invoice.tenant,
        invoice=invoice,
        item_type=InvoiceItem.ItemType.AJUSTE,
        description=description,
        quantity=quantity,
        unit_price=price,
    )
    invoice.persistir_totais()

    return item


adicionar_item_invoice = add_invoice_item
