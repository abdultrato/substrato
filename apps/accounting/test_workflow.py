from __future__ import annotations

from decimal import Decimal
from uuid import uuid4

import pytest
from django.core.exceptions import ValidationError

from apps.accounting.models.account import Account
from apps.accounting.models.legacy_entry import LegacyEntry
from apps.accounting.models.legacy_movement import LegacyMovement
from apps.tenants.models.tenant import Tenant


def _tenant():
    suffix = uuid4().hex[:8]
    return Tenant.objects.create(identifier=f"tn-acc-{suffix}", name="Tenant Acc")


def _account(tenant, name="Caixa"):
    return Account.objects.create(tenant=tenant, name=name)


def _entry(tenant):
    return LegacyEntry.objects.create(tenant=tenant, description="Receita de consulta")


def _move(tenant, entry, account, *, debit="0.00", credit="0.00"):
    return LegacyMovement.objects.create(
        tenant=tenant, entry=entry, account=account,
        debit=Decimal(debit), credit=Decimal(credit),
    )


@pytest.mark.django_db
def test_confirm_balanced_entry_then_reopen():
    tenant = _tenant()
    caixa = _account(tenant, "Caixa")
    receita = _account(tenant, "Receita")
    entry = _entry(tenant)
    _move(tenant, entry, caixa, debit="100.00")
    _move(tenant, entry, receita, credit="100.00")

    entry.confirm()
    assert entry.confirmed is True

    entry.unconfirm()
    assert entry.confirmed is False


@pytest.mark.django_db
def test_confirm_rejects_unbalanced_entry():
    tenant = _tenant()
    caixa = _account(tenant, "Caixa")
    receita = _account(tenant, "Receita")
    entry = _entry(tenant)
    _move(tenant, entry, caixa, debit="100.00")
    _move(tenant, entry, receita, credit="50.00")
    with pytest.raises(ValidationError):
        entry.confirm()
    entry.refresh_from_db()
    assert entry.confirmed is False


@pytest.mark.django_db
def test_confirm_requires_two_movements():
    tenant = _tenant()
    caixa = _account(tenant, "Caixa")
    entry = _entry(tenant)
    _move(tenant, entry, caixa, debit="100.00")
    with pytest.raises(ValidationError):
        entry.confirm()


@pytest.mark.django_db
def test_confirm_twice_rejected_and_reopen_guard():
    tenant = _tenant()
    caixa = _account(tenant, "Caixa")
    receita = _account(tenant, "Receita")
    entry = _entry(tenant)
    _move(tenant, entry, caixa, debit="80.00")
    _move(tenant, entry, receita, credit="80.00")
    entry.confirm()
    with pytest.raises(ValidationError):
        entry.confirm()

    fresh = _entry(tenant)  # nunca confirmado
    with pytest.raises(ValidationError):
        fresh.unconfirm()
