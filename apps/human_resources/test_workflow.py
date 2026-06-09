from __future__ import annotations

from uuid import uuid4

import pytest
from django.core.exceptions import ValidationError

from apps.human_resources.models.absence import Absence
from apps.human_resources.models.employee import Employee
from apps.tenants.models.tenant import Tenant


def _tenant():
    s = uuid4().hex[:8]
    return Tenant.objects.create(identifier=f"tn-rh-{s}", name="Tenant RH", domain=f"{s}.local", active=True)


def _employee(tenant):
    return Employee.objects.create(tenant=tenant, name="Funcionário", email=f"{uuid4().hex[:6]}@ex.com")


def _absence(tenant):
    return Absence.objects.create(tenant=tenant, employee=_employee(tenant))


@pytest.mark.django_db
def test_justify_then_approve_marks_justified():
    tenant = _tenant()
    absence = _absence(tenant)
    assert absence.status == Absence.Status.REPORTED

    absence.submit_justification(reason="Atestado médico")
    assert absence.status == Absence.Status.PENDING_JUSTIFICATION
    assert absence.reason == "Atestado médico"

    absence.approve_justification()
    assert absence.status == Absence.Status.JUSTIFIED
    assert absence.justified is True


@pytest.mark.django_db
def test_reject_justification_marks_unjustified():
    tenant = _tenant()
    absence = _absence(tenant)
    absence.submit_justification(reason="Sem documento")
    absence.reject_justification()
    assert absence.status == Absence.Status.UNJUSTIFIED
    assert absence.justified is False


@pytest.mark.django_db
def test_approve_requires_pending_justification():
    tenant = _tenant()
    absence = _absence(tenant)  # REPORTED
    with pytest.raises(ValidationError):
        absence.approve_justification()
    with pytest.raises(ValidationError):
        absence.reject_justification()
