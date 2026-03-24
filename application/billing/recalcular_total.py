from django.db import transaction

from domain.billing.calculos import calcular_total


@transaction.atomic
def recalcular_total_fatura(fatura):
    itens = fatura.itens.all()
    total = calcular_total(itens)

    fatura.total = total
    fatura.save(update_fields=["total"])

    return total
