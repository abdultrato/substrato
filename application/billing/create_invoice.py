from django.db import transaction

from apps.billing.models.invoice import Invoice


@transaction.atomic
def create_invoice(paciente):
    return Invoice.objects.create(paciente=paciente)


criar_fatura = create_invoice
