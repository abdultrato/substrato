from django.db import transaction

from domain.billing.calculos import calcular_total


@transaction.atomic
def recalculate_invoice_total(fatura):
    itens = fatura.itens.all()
    total = calcular_total(itens)

    fatura.total = total
    fatura.save(update_fields=["total"])

    return total


recalcular_total_fatura = recalculate_invoice_total
