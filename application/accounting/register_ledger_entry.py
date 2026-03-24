from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.accounting.models.ledger_entry import LedgerEntry
from apps.accounting.models.ledger_line import LedgerLine
from domain.accounting.aggregates import LedgerAggregate
from domain.accounting.exceptions import (
    AccountingDomainError,
    TenantViolationError,
)
from events.accounting.balance_update_handler import handle as update_balance
from events.accounting.ledger_entry_created import (
    LedgerEntryCreated,
    LedgerLineDTO,
)


class DuplicateOperationError(
    AccountingDomainError,
):
    pass


@transaction.atomic
def execute(
    inquilino,
    descricao,
    data_contabil,
    linhas,
    idempotency_key=None,
):
    if idempotency_key and LedgerEntry.objects.select_for_update().filter(
        inquilino=inquilino,
        idempotency_key=idempotency_key,
    ).exists():
        raise DuplicateOperationError(
            "Operação já processada para esta chave.",
        )

    # =====================================================
    # 🔍 VALIDAÇÃO DOMÍNIO
    # =====================================================

    aggregate = LedgerAggregate(
        linhas,
    )
    aggregate.validate()

    # =====================================================
    # 🔎 VALIDAÇÃO MULTI-TENANT
    # =====================================================

    for linha in linhas:
        if linha.conta.inquilino_id != inquilino.id:
            raise TenantViolationError(
                "Conta pertence a outro inquilino.",
            )

    # =====================================================
    # 🧾 CRIAR LEDGER ENTRY
    # =====================================================

    reference = (idempotency_key or f"LED-{timezone.now():%Y%m%d%H%M%S%f}")[:120]

    try:
        entry = LedgerEntry.objects.create(
            inquilino=inquilino,
            descricao=descricao,
            data_contabil=data_contabil,
            referencia_externa=reference,
            idempotency_key=idempotency_key,
        )
    except IntegrityError as exc:
        if idempotency_key:
            raise DuplicateOperationError(
                "Operação já processada para esta chave.",
            ) from exc
        raise

    # =====================================================
    # 💰 BULK CREATE LINHAS
    # =====================================================

    linhas_model = []
    for linha in linhas:
        linhas_model.append(
            LedgerLine(
                entry=entry,
                conta=linha.conta,
                valor=getattr(linha.valor, "valor", linha.valor),
                natureza=getattr(linha.natureza, "tipo", linha.natureza),
                inquilino=inquilino,
            )
        )

    LedgerLine.objects.bulk_create(
        linhas_model,
    )

    # =====================================================
    # 📡 PUBLICAR EVENTO APÓS COMMIT
    # =====================================================

    def publish_event():
        event = LedgerEntryCreated(
            entry_id=entry.id,
            inquilino_id=entry.inquilino_id,
            data_contabil=entry.data_contabil,
            linhas=[
                LedgerLineDTO(
                    conta_id=linha_model.conta_id,
                    valor=str(
                        linha_model.valor,
                    ),
                    natureza=linha_model.natureza,
                )
                for linha_model in linhas_model
            ],
        )

        update_balance(
            event,
        )

    transaction.on_commit(
        publish_event,
    )

    return entry


OperacaoDuplicadaErro = DuplicateOperationError
executar = execute
