# faturamento/servicos/cancelar_fatura.py

from django.core.exceptions import ValidationError
from django.db import transaction

from apps.accounting.services.reverter_ledger_entry import executar as reverter_ledger


@transaction.atomic
def cancel_invoice(invoice):
    if invoice.estado != invoice.Estado.EMITIDA:
        raise ValidationError("Somente faturas emitidas podem ser canceladas.")

    ledger_entry = invoice.ledger_entry

    reverter_ledger(
        ledger_entry_id=ledger_entry.id,
        motivo=f"Cancelamento da fatura {invoice.id_custom}",
    )

    invoice.estado = invoice.Estado.CANCELADA
    invoice.save(update_fields=["estado"])

    return invoice


cancelar_fatura = cancel_invoice
