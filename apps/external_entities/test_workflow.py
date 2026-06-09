from __future__ import annotations

from uuid import uuid4

import pytest

from apps.external_entities.models.company import Company
from apps.tenants.models.tenant import Tenant


def _tenant():
    s = uuid4().hex[:8]
    return Tenant.objects.create(identifier=f"tn-ent-{s}", name="Tenant Ent", domain=f"{s}.local", active=True)


def _company(tenant, *, active=True):
    return Company.objects.create(tenant=tenant, name=f"Fornecedor {uuid4().hex[:4]}", active=active)


@pytest.mark.django_db
def test_company_deactivate_then_activate():
    tenant = _tenant()
    company = _company(tenant)
    assert company.active is True

    company.deactivate()
    company.refresh_from_db()
    assert company.active is False

    company.activate()
    company.refresh_from_db()
    assert company.active is True


@pytest.mark.django_db
def test_company_deactivate_is_idempotent():
    tenant = _tenant()
    company = _company(tenant, active=False)
    company.deactivate()
    company.refresh_from_db()
    assert company.active is False
