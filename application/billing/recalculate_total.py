from django.db import transaction

from domain.billing.calculator import calculate_totals


@transaction.atomic
def recalculate_invoice_total(invoice):
    items = invoice.items.all()
    totals = calculate_totals(items=items)
    total = totals["total"]

    invoice.total = total
    invoice.save(update_fields=["total"])

    return total
