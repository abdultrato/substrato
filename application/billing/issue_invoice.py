from django.db import transaction

from application.billing.commands import IssueInvoiceCommand
from application.billing.handlers import handle_issue_invoice


@transaction.atomic
def issue_invoice(invoice):
    return handle_issue_invoice(
        IssueInvoiceCommand(
            invoice=invoice,
            idempotent=False,
        )
    )


emitir_invoice = issue_invoice
