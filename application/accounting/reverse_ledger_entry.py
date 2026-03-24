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
    motivo: str,
    idempotency_key: str | None = None,
):

    # =====================================================
    # 🔒 LOCK PESSIMISTA DO ORIGINAL
    # =====================================================

    original = (
        LedgerEntry.objects.select_for_update()
        .select_related(
            "inquilino",
        )
        .prefetch_related(
            "linhas",
        )
        .get(
            id=ledger_entry_id,
        )
    )

    if original.revertido:
        raise LedgerAlreadyReversedError(
            "LedgerEntry já foi revertido.",
        )

    # =====================================================
    # 🔁 GERAR LINHAS INVERTIDAS (DTO)
    # =====================================================

    linhas_invertidas = []

    for linha in original.linhas.all():
        natureza_invertida = "C" if linha.natureza == "D" else "D"

        linhas_invertidas.append(
            type(
                "LinhaDTO",
                (),
                {
                    "conta": linha.conta,
                    "valor": linha.valor,
                    "natureza": natureza_invertida,
                    "conta_id": linha.conta_id,
                },
            )(),
        )

    # =====================================================
    # 🧾 USAR O MOTOR PRINCIPAL (REAPROVEITAR)
    # =====================================================

    reverso = register_entry(
        inquilino=original.inquilino,
        descricao=f"REVERSÃO: {original.descricao}",
        data_contabil=timezone.localdate(),
        linhas=linhas_invertidas,
        idempotency_key=idempotency_key,
    )

    # =====================================================
    # 🔗 VINCULAR REVERSÃO
    # =====================================================

    original.revertido = True
    original.reverso_de_id = reverso.id
    original.motivo_reversao = motivo
    original.save(
        update_fields=[
            "revertido",
            "reverso_de",
            "motivo_reversao",
        ],
    )

    return reverso


LedgerJaRevertidoErro = LedgerAlreadyReversedError
executar = execute
