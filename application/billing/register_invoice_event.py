from apps.billing.models import InvoiceHistory


def register_invoice_event(invoice, description, type=None):
    return InvoiceHistory.objects.create(
        invoice=invoice,
        description=description,
        event_type=type,
    )
