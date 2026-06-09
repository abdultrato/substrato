from __future__ import annotations

from uuid import uuid4

import pytest

from apps.equipment.models.equipment import Equipment
from apps.tenants.models.tenant import Tenant


def _tenant():
    s = uuid4().hex[:8]
    return Tenant.objects.create(identifier=f"tn-eqp-{s}", name="Tenant Eqp", domain=f"{s}.local", active=True)


def _equipment(tenant, *, active=True):
    return Equipment.objects.create(
        tenant=tenant, name="Autoclave", serial_number=f"SN-{uuid4().hex[:6]}", active=active,
    )


@pytest.mark.django_db
def test_deactivate_then_activate():
    tenant = _tenant()
    eq = _equipment(tenant)
    assert eq.active is True

    eq.deactivate()
    eq.refresh_from_db()
    assert eq.active is False

    eq.activate()
    eq.refresh_from_db()
    assert eq.active is True


@pytest.mark.django_db
def test_deactivate_is_idempotent():
    tenant = _tenant()
    eq = _equipment(tenant, active=False)
    eq.deactivate()
    eq.refresh_from_db()
    assert eq.active is False
