from __future__ import annotations

from uuid import uuid4

import pytest
from django.core.exceptions import ValidationError

from apps.clinical.models.patient import Patient
from apps.surgery.models import SurgicalRequest
from apps.tenants.models.tenant import Tenant


def _tenant():
    s = uuid4().hex[:8]
    return Tenant.objects.create(identifier=f"tn-sur-{s}", name="Tenant Sur", domain=f"{s}.local", active=True)


def _patient(tenant):
    return Patient.objects.create(tenant=tenant, name="Paciente", document_number=f"SUR-{uuid4().hex[:6]}")


def _request(tenant):
    return SurgicalRequest.objects.create(tenant=tenant, patient=_patient(tenant))


@pytest.mark.django_db
def test_submit_then_approve_sets_reviewed_at():
    tenant = _tenant()
    req = _request(tenant)
    assert req.status == SurgicalRequest.Status.DRAFT

    req.submit()
    assert req.status == SurgicalRequest.Status.REQUESTED

    req.approve()
    assert req.status == SurgicalRequest.Status.APPROVED
    assert req.reviewed_at is not None


@pytest.mark.django_db
def test_approve_requires_submitted_request():
    tenant = _tenant()
    req = _request(tenant)  # DRAFT
    with pytest.raises(ValidationError):
        req.approve()


@pytest.mark.django_db
def test_reject_requires_reason():
    tenant = _tenant()
    req = _request(tenant)
    req.submit()
    # Sem justificação → clean() bloqueia.
    with pytest.raises(ValidationError):
        req.reject()

    req.reject(reason="Paciente sem indicação cirúrgica")
    assert req.status == SurgicalRequest.Status.REJECTED
    assert req.reviewed_at is not None


@pytest.mark.django_db
def test_cancel_blocks_when_terminal():
    tenant = _tenant()
    req = _request(tenant)
    req.submit()
    req.cancel(reason="Desistência do paciente")
    assert req.status == SurgicalRequest.Status.CANCELLED
    assert "Cancelamento" in req.notes
    with pytest.raises(ValidationError):
        req.cancel()
