from __future__ import annotations

from uuid import uuid4

import pytest
from django.core.exceptions import ValidationError

from apps.equipment.models.equipment import Equipment
from apps.incidents.models.incident import Incident
from apps.tenants.models.tenant import Tenant


def _tenant():
    s = uuid4().hex[:8]
    return Tenant.objects.create(identifier=f"tn-ocr-{s}", name="Tenant Ocr", domain=f"{s}.local", active=True)


def _incident(tenant):
    eq = Equipment.objects.create(tenant=tenant, name="Monitor", serial_number=f"SN-{uuid4().hex[:6]}")
    return Incident.objects.create(
        tenant=tenant, equipment=eq, type=Incident.Type.BREAKDOWN, description="Falha no monitor",
    )


@pytest.mark.django_db
def test_resolve_clears_pending_maintenance():
    tenant = _tenant()
    incident = _incident(tenant)
    # Ao criar com equipamento, o save() marca manutenção pendente.
    assert incident.requires_maintenance is True
    assert incident.resolved is False

    incident.resolve()
    incident.refresh_from_db()
    assert incident.resolved is True
    assert incident.requires_maintenance is False
    assert incident.maintenance_completed_at is not None

    # Já resolvida não pode ser resolvida de novo.
    with pytest.raises(ValidationError):
        incident.resolve()


@pytest.mark.django_db
def test_reopen_reactivates_maintenance():
    tenant = _tenant()
    incident = _incident(tenant)
    incident.resolve()

    incident.reopen(reason="Avaria voltou")
    incident.refresh_from_db()
    assert incident.resolved is False
    assert incident.requires_maintenance is True  # save() reativa por ter equipamento
    assert incident.maintenance_completed_at is None
    assert "Reabertura" in (incident.post_incident_actions or "")


@pytest.mark.django_db
def test_reopen_requires_resolved():
    tenant = _tenant()
    incident = _incident(tenant)  # não resolvida
    with pytest.raises(ValidationError):
        incident.reopen()
