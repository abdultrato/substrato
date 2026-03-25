# faturamento/servicos/cancelar_invoice.py

from django.core.exceptions import ValidationError
from django.db import transaction

from apps.accounting.services.reverter_ledger_entry import executar as reverter_ledger


@transaction.atomic
def cancel_invoice(invoice):
    if invoice.status != invoice.Estado.EMITIDA:
        raise ValidationError("Somente faturas emitidas podem ser canceladas.")

    ledger_entry = invoice.ledger_entry

    reverter_ledger(
        ledger_entry_id=ledger_entry.id,
        reason=f"Cancelamento da invoice {invoice.custom_id}",
    )

    invoice.status = invoice.Estado.CANCELADA
    invoice.save(update_fields=["status"])

    return invoice


cancelar_invoice = cancel_invoice
