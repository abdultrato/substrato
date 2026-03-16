# faturamento/servicos/emitir_fatura.py

from django.db import transaction

from aplicativos.contabilidade.servicos.registrar_ledger_entry import executar


@transaction.atomic
def emitir_fatura(fatura):
    fatura.emitir()

    total = fatura.total

    linhas = [
        {
            "conta": fatura.inquilino.conta_clientes,
            "valor": total,
            "natureza": "D",
        },
        {
            "conta": fatura.inquilino.conta_receita,
            "valor": total,
            "natureza": "C",
        },
    ]

    executar(
        inquilino=fatura.inquilino,
        descricao=f"Fatura {fatura.id_custom}",
        data_contabil=fatura.criado_em.date(),
        linhas=linhas,
        idempotency_key=f"fatura-{fatura.id}",
    )
