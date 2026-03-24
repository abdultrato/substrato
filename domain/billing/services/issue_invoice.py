# faturamento/servicos/emitir_fatura.py

from django.db import transaction

from apps.accounting.services.registrar_ledger_entry import executar


@transaction.atomic
def issue_invoice(invoice):
    invoice.emitir()

    total = invoice.total

    lines = [
        {
            "conta": invoice.inquilino.conta_clientes,
            "valor": total,
            "natureza": "D",
        },
        {
            "conta": invoice.inquilino.conta_receita,
            "valor": total,
            "natureza": "C",
        },
    ]

    executar(
        inquilino=invoice.inquilino,
        descricao=f"Fatura {invoice.id_custom}",
        data_contabil=invoice.criado_em.date(),
        linhas=lines,
        idempotency_key=f"fatura-{invoice.id}",
    )


emitir_fatura = issue_invoice
