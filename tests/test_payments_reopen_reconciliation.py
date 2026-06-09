from uuid import uuid4

import pytest
from django.core.exceptions import ValidationError

from application.payments.commands import (
    ConfirmReconciliationCommand,
    ReopenReconciliationCommand,
)
from application.payments.handlers import (
    handle_confirm_reconciliation,
    handle_reopen_reconciliation,
)
from apps.payments.models.reconciliation import Reconciliation
from apps.payments.models.transaction import Transaction


def _transaction():
    return Transaction.objects.create(
        external_reference=f"ref-{uuid4().hex[:8]}", gateway="stripe", status="confirmed",
    )


@pytest.mark.django_db
def test_reopen_reconciliation_reverts_confirmation():
    rec = Reconciliation.objects.create(transaction=_transaction())
    handle_confirm_reconciliation(ConfirmReconciliationCommand(reconciliation=rec, idempotent=True))
    rec.refresh_from_db()
    assert rec.confirmed is True
    assert rec.confirmation_date is not None

    handle_reopen_reconciliation(ReopenReconciliationCommand(reconciliation=rec, idempotent=True))
    rec.refresh_from_db()
    assert rec.confirmed is False
    assert rec.confirmation_date is None


@pytest.mark.django_db
def test_reopen_is_idempotent_when_already_pending():
    rec = Reconciliation.objects.create(transaction=_transaction())
    assert rec.confirmed is False
    # Idempotente: reabrir uma conciliação já pendente não lança.
    handle_reopen_reconciliation(ReopenReconciliationCommand(reconciliation=rec, idempotent=True))
    rec.refresh_from_db()
    assert rec.confirmed is False


@pytest.mark.django_db
def test_reopen_non_idempotent_raises_when_pending():
    rec = Reconciliation.objects.create(transaction=_transaction())
    with pytest.raises(ValidationError):
        rec.reopen()  # método do modelo recusa reabrir o que já está pendente
