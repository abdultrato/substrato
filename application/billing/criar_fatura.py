from django.db import transaction

from apps.billing.models.invoice import Invoice


@transaction.atomic
def criar_fatura(paciente):
    return Invoice.objects.create(paciente=paciente)
