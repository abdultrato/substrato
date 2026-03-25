from django.db import transaction

from apps.billing.models.invoice import Invoice


@transaction.atomic
def create_invoice(patient):
    return Invoice.objects.create(patient=patient)


criar_invoice = create_invoice
