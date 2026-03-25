from django.db import transaction

from domain.billing.calculos import calcular_total


@transaction.atomic
def recalculate_invoice_total(invoice):
    itens = invoice.itens.all()
    total = calcular_total(itens)

    invoice.total = total
    invoice.save(update_fields=["total"])

    return total


recalcular_total_invoice = recalculate_invoice_total
