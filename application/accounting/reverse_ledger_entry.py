from django.db import transaction
from django.utils import timezone

from application.accounting.register_ledger_entry import execute as register_entry
from apps.accounting.models.ledger_entry import LedgerEntry
from domain.accounting.exceptions import AccountingDomainError


class LedgerAlreadyReversedError(
    AccountingDomainError,
):
    pass


@transaction.atomic
def execute(
    ledger_entry_id: int,
    reason: str,
    idempotency_key: str | None = None,
):

    # =====================================================
    # 🔒 LOCK PESSIMISTA DO ORIGINAL
    # =====================================================

    original = (
        LedgerEntry.objects.select_for_update()
        .select_related(
            "tenant",
        )
        .prefetch_related(
            "linhas",
        )
        .get(
            id=ledger_entry_id,
        )
    )

    if original.reversed:
        raise LedgerAlreadyReversedError(
            "LedgerEntry já foi reversed.",
        )

    # =====================================================
    # 🔁 GERAR LINHAS INVERTIDAS (DTO)
    # =====================================================

    linhas_invertidas = []

    for linha in original.linhas.all():
        nature_invertida = "C" if linha.nature == "D" else "D"

        linhas_invertidas.append(
            type(
                "LinhaDTO",
                (),
                {
                    "account": linha.account,
                    "value": linha.value,
                    "nature": nature_invertida,
                    "account_id": linha.account_id,
                },
            )(),
        )

    # =====================================================
    # 🧾 USAR O MOTOR PRINCIPAL (REAPROVEITAR)
    # =====================================================

    reverso = register_entry(
        tenant=original.tenant,
        description=f"REVERSÃO: {original.description}",
        accounting_date=timezone.localdate(),
        linhas=linhas_invertidas,
        idempotency_key=idempotency_key,
    )

    # =====================================================
    # 🔗 VINCULAR REVERSÃO
    # =====================================================

    original.reversed = True
    original.reversal_of_id = reverso.id
    original.reversal_reason = reason
    original.save(
        update_fields=[
            "reversed",
            "reversal_of",
            "reversal_reason",
        ],
    )

    return reverso


