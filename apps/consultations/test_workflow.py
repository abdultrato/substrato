from __future__ import annotations

from decimal import Decimal
from uuid import uuid4

import pytest

from apps.consultations.models.consultation_specialty import ConsultationSpecialty
from apps.tenants.models.tenant import Tenant


def _tenant():
    suffix = uuid4().hex[:8]
    return Tenant.objects.create(identifier=f"tn-cons-{suffix}", name="Tenant Cons")


def _specialty(tenant, *, active=True):
    return ConsultationSpecialty.objects.create(
        tenant=tenant, name=f"Cardiologia {uuid4().hex[:4]}",
        base_price=Decimal("1500.00"), vat_percentage=Decimal("0.00"), active=active,
    )


@pytest.mark.django_db
def test_specialty_deactivate_then_activate():
    tenant = _tenant()
    specialty = _specialty(tenant)
    assert specialty.active is True

    specialty.deactivate()
    specialty.refresh_from_db()
    assert specialty.active is False

    specialty.activate()
    specialty.refresh_from_db()
    assert specialty.active is True


@pytest.mark.django_db
def test_specialty_deactivate_is_idempotent():
    tenant = _tenant()
    specialty = _specialty(tenant, active=False)
    specialty.deactivate()
    specialty.refresh_from_db()
    assert specialty.active is False
