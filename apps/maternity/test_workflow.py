from __future__ import annotations

from uuid import uuid4

import pytest
from django.core.exceptions import ValidationError

from apps.clinical.models.patient import Patient
from apps.maternity.models.pregnancy import Pregnancy
from apps.tenants.models.tenant import Tenant


def _tenant():
    s = uuid4().hex[:8]
    return Tenant.objects.create(identifier=f"tn-mat-{s}", name="Tenant Mat", domain=f"{s}.local", active=True)


def _patient(tenant):
    return Patient.objects.create(tenant=tenant, name="Gestante", document_number=f"MAT-{uuid4().hex[:6]}")


def _pregnancy(tenant):
    return Pregnancy.objects.create(tenant=tenant, patient=_patient(tenant))


@pytest.mark.django_db
def test_register_delivery_updates_history_then_close():
    tenant = _tenant()
    pregnancy = _pregnancy(tenant)
    assert pregnancy.status == Pregnancy.Status.FOLLOW_UP

    pregnancy.register_delivery(cesarean=True)
    assert pregnancy.status == Pregnancy.Status.DELIVERY
    assert pregnancy.total_deliveries == 1
    assert pregnancy.cesareans == 1
    assert pregnancy.normal_deliveries == 0

    pregnancy.close()
    assert pregnancy.status == Pregnancy.Status.CLOSED


@pytest.mark.django_db
def test_register_delivery_requires_follow_up():
    tenant = _tenant()
    pregnancy = _pregnancy(tenant)
    pregnancy.register_delivery()  # vaginal → DELIVERY
    assert pregnancy.normal_deliveries == 1
    # Já em parto: não pode registar de novo.
    with pytest.raises(ValidationError):
        pregnancy.register_delivery()


@pytest.mark.django_db
def test_cancel_records_reason_and_blocks_when_terminal():
    tenant = _tenant()
    pregnancy = _pregnancy(tenant)
    pregnancy.cancel(reason="Abortamento espontâneo")
    assert pregnancy.status == Pregnancy.Status.CANCELED
    assert "Cancelamento" in pregnancy.notes
    with pytest.raises(ValidationError):
        pregnancy.close()
    with pytest.raises(ValidationError):
        pregnancy.register_delivery()
