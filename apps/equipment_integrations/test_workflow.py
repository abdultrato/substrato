from __future__ import annotations

from uuid import uuid4

import pytest
from django.core.exceptions import ValidationError

from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.patient import Patient
from apps.equipment_integrations.models import IntegrationEquipment, IntegrationOrder
from apps.tenants.models.tenant import Tenant


def _tenant():
    s = uuid4().hex[:8]
    return Tenant.objects.create(identifier=f"tn-eqi-{s}", name="Tenant EqI", domain=f"{s}.local", active=True)


def _equipment(tenant, *, active=True):
    return IntegrationEquipment.objects.create(
        tenant=tenant, name="Analisador", serial_number=f"SN-{uuid4().hex[:5]}", active=active,
    )


def _order(tenant):
    patient = Patient.objects.create(tenant=tenant, name="Paciente", document_number=f"EQ-{uuid4().hex[:6]}")
    request = LabRequest.objects.create(tenant=tenant, patient=patient)
    return IntegrationOrder.objects.create(tenant=tenant, equipment=_equipment(tenant), request=request)


@pytest.mark.django_db
def test_equipment_deactivate_then_activate():
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
def test_order_mark_sent_then_blocked():
    tenant = _tenant()
    order = _order(tenant)
    assert order.status == IntegrationOrder.Status.PENDING

    order.mark_sent()
    assert order.status == IntegrationOrder.Status.SENT
    # Já enviada não pode ser enviada de novo.
    with pytest.raises(ValidationError):
        order.mark_sent()


@pytest.mark.django_db
def test_order_cancel_records_reason_and_blocks_when_terminal():
    tenant = _tenant()
    order = _order(tenant)
    order.cancel(reason="Pedido errado")
    assert order.status == IntegrationOrder.Status.CANCELED
    assert "Cancelamento" in order.observation
    with pytest.raises(ValidationError):
        order.cancel()
