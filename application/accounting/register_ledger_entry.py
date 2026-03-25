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
    tenant,
    description,
    accounting_date,
    linhas,
    idempotency_key=None,
):
    if idempotency_key and LedgerEntry.objects.select_for_update().filter(
        tenant=tenant,
        idempotency_key=idempotency_key,
    ).exists():
        raise DuplicateOperationError(
            "Operação já processada para esta key.",
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
        if linha.account.tenant_id != tenant.id:
            raise TenantViolationError(
                "Conta pertence a outro tenant.",
            )

    # =====================================================
    # 🧾 CRIAR LEDGER ENTRY
    # =====================================================

    reference = (idempotency_key or f"LED-{timezone.now():%Y%m%d%H%M%S%f}")[:120]

    try:
        entry = LedgerEntry.objects.create(
            tenant=tenant,
            description=description,
            accounting_date=accounting_date,
            external_reference=reference,
            idempotency_key=idempotency_key,
        )
    except IntegrityError as exc:
        if idempotency_key:
            raise DuplicateOperationError(
                "Operação já processada para esta key.",
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
                account=linha.account,
                value=getattr(linha.value, "value", linha.value),
                nature=getattr(linha.nature, "type", linha.nature),
                tenant=tenant,
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
            tenant_id=entry.tenant_id,
            accounting_date=entry.accounting_date,
            linhas=[
                LedgerLineDTO(
                    account_id=linha_model.account_id,
                    value=str(
                        linha_model.value,
                    ),
                    nature=linha_model.nature,
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


