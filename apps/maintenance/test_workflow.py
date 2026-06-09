from __future__ import annotations

from uuid import uuid4

import pytest
from django.core.exceptions import ValidationError

from apps.equipment.models.equipment import Equipment
from apps.incidents.models.incident import Incident
from apps.maintenance.models.maintenance import Maintenance
from apps.tenants.models.tenant import Tenant


def _tenant():
    s = uuid4().hex[:8]
    return Tenant.objects.create(identifier=f"tn-mnt-{s}", name="Tenant Mnt", domain=f"{s}.local", active=True)


def _scheduled_maintenance(tenant):
    eq = Equipment.objects.create(tenant=tenant, name="Bomba", serial_number=f"SN-{uuid4().hex[:6]}")
    incident = Incident.objects.create(
        tenant=tenant, equipment=eq, type=Incident.Type.BREAKDOWN, description="Falha",
    )
    maintenance = Maintenance.objects.create(
        tenant=tenant,
        incident=incident,
        maintenance_type=Maintenance.MaintenanceType.CORRECTIVE,
        performed_date=None,
    )
    return maintenance, incident


@pytest.mark.django_db
def test_mark_performed_resolves_linked_incident():
    tenant = _tenant()
    maintenance, incident = _scheduled_maintenance(tenant)
    assert maintenance.performed_date is None
    assert incident.requires_maintenance is True
    assert incident.resolved is False

    maintenance.mark_performed()
    maintenance.refresh_from_db()
    incident.refresh_from_db()

    assert maintenance.performed_date is not None
    assert maintenance.performed is True
    # A cadeia fecha a ocorrência ligada.
    assert incident.resolved is True
    assert incident.requires_maintenance is False
    assert incident.maintenance_completed_at is not None


@pytest.mark.django_db
def test_mark_performed_is_blocked_when_already_done():
    tenant = _tenant()
    maintenance, _ = _scheduled_maintenance(tenant)
    maintenance.mark_performed()
    with pytest.raises(ValidationError):
        maintenance.mark_performed()
