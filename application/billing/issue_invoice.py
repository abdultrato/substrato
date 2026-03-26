from django.db import transaction


@transaction.atomic
def issue_invoice(invoice):
    invoice.issue()
    return invoice


emitir_invoice = issue_invoice
