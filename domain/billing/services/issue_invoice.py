# faturamento/servicos/emitir_invoice.py

from django.db import transaction

from apps.accounting.services.registrar_ledger_entry import executar


@transaction.atomic
def issue_invoice(invoice):
    invoice.emitir()

    total = invoice.total

    lines = [
        {
            "account": invoice.tenant.account_clientes,
            "value": total,
            "nature": "D",
        },
        {
            "account": invoice.tenant.account_receita,
            "value": total,
            "nature": "C",
        },
    ]

    executar(
        tenant=invoice.tenant,
        description=f"Fatura {invoice.custom_id}",
        accounting_date=invoice.created_at.date(),
        linhas=lines,
        idempotency_key=f"invoice-{invoice.id}",
    )


emitir_invoice = issue_invoice
