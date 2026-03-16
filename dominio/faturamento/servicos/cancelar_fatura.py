# faturamento/servicos/cancelar_fatura.py

from django.core.exceptions import ValidationError
from django.db import transaction

from aplicativos.contabilidade.servicos.reverter_ledger_entry import executar as reverter_ledger


@transaction.atomic
def cancelar_fatura(fatura):
    if fatura.estado != fatura.Estado.EMITIDA:
        raise ValidationError("Somente faturas emitidas podem ser canceladas.")

    # 🔎 localizar ledger associado
    ledger_entry = fatura.ledger_entry  # se você armazenar referência

    # 🔄 reverter lançamento contábil
    reverter_ledger(
        ledger_entry_id=ledger_entry.id,
        motivo=f"Cancelamento da fatura {fatura.id_custom}",
    )

    # ❄️ atualizar estado
    fatura.estado = fatura.Estado.CANCELADA
    fatura.save(update_fields=["estado"])

    return fatura
