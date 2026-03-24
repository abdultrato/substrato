from django.db import transaction
from django.utils import timezone

from application.accounting.registrar_ledger_entry import executar as registrar_entry
from apps.accounting.models.ledger_entry import LedgerEntry
from domain.accounting.excecoes import DominioContabilidadeErro


class LedgerJaRevertidoErro(
    DominioContabilidadeErro,
):
    pass


@transaction.atomic
def executar(
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
        raise LedgerJaRevertidoErro(
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

    reverso = registrar_entry(
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
