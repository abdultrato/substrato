from __future__ import annotations

from decimal import Decimal
from uuid import uuid4

import pytest
from django.core.exceptions import ValidationError

from apps.insurer.models.coverage_plan import CoveragePlan
from apps.insurer.models.insurer import Insurer
from apps.insurer.models.procedure_authorization import ProcedureAuthorization
from apps.tenants.models.tenant import Tenant


def _tenant():
    s = uuid4().hex[:8]
    return Tenant.objects.create(identifier=f"tn-seg-{s}", name="Tenant Seg", domain=f"{s}.local", active=True)


def _plan(tenant):
    insurer = Insurer.objects.create(
        tenant=tenant, name="Seguradora X", external_code=f"EXT-{uuid4().hex[:5]}", phone="800000",
    )
    return CoveragePlan.objects.create(
        tenant=tenant, insurer=insurer, name="Plano Base", coverage_percentage=Decimal("80.00"),
    )


def _auth(tenant):
    return ProcedureAuthorization.objects.create(
        tenant=tenant, request_id=f"REQ-{uuid4().hex[:6]}", plan=_plan(tenant),
    )


@pytest.mark.django_db
def test_approve_sets_code_and_response_date():
    tenant = _tenant()
    auth = _auth(tenant)
    assert auth.status == ProcedureAuthorization.Status.PENDENTE

    auth.approve(authorization_code="AUTH-123")
    assert auth.status == ProcedureAuthorization.Status.APROVADA
    assert auth.authorization_code == "AUTH-123"
    assert auth.response_date is not None


@pytest.mark.django_db
def test_deny_records_reason():
    tenant = _tenant()
    auth = _auth(tenant)
    auth.deny(reason="Serviço não coberto")
    assert auth.status == ProcedureAuthorization.Status.NEGADA
    assert auth.response_date is not None
    assert "Negada" in (auth.description or "")


@pytest.mark.django_db
def test_only_pending_can_be_decided():
    tenant = _tenant()
    auth = _auth(tenant)
    auth.approve()
    with pytest.raises(ValidationError):
        auth.approve()
    with pytest.raises(ValidationError):
        auth.deny(reason="tarde demais")
