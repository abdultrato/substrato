from decimal import Decimal

import pytest

from apps.insurer.models.coverage_plan import CoveragePlan
from apps.insurer.models.insurer import Insurer
from apps.insurer.models.procedure_authorization import ProcedureAuthorization
from apps.tenants.models.tenant import Tenant


def _tenant():
    return Tenant.objects.create(identifier="tn-seg", name="Tenant Seg")


@pytest.mark.django_db
def test_insurer_creation():
    tenant = _tenant()
    seg = Insurer.objects.create(tenant=tenant, name="Seguro X", email="seg@example.com")
    assert seg.pk
    assert seg.active is True


@pytest.mark.django_db
def test_coverage_plan_percentage():
    tenant = _tenant()
    seg = Insurer.objects.create(tenant=tenant, name="Seguro Y")
    plan = CoveragePlan.objects.create(
        tenant=tenant,
        insurer=seg,
        name="Plano Ouro",
        coverage_percentage=Decimal("80.00"),
        requires_authorization=True,
    )
    assert plan.percentual_final() == Decimal("80.00")
    assert plan.requires_authorization is True


@pytest.mark.django_db
def test_authorization_flow():
    tenant = _tenant()
    seg = Insurer.objects.create(tenant=tenant, name="Seguro Z")
    plan = CoveragePlan.objects.create(
        tenant=tenant, insurer=seg, name="Plano Prata", coverage_percentage=Decimal("50.00")
    )
    aut = ProcedureAuthorization.objects.create(
        tenant=tenant,
        plan=plan,
        request_id="REQ123",
        status=ProcedureAuthorization.Status.PENDENTE,
    )
    aut.mark_response(ProcedureAuthorization.Status.APROVADA, authorization_code="AUTH-001")
    aut.refresh_from_db()
    assert aut.status == ProcedureAuthorization.Status.APROVADA
    assert aut.authorization_code == "AUTH-001"
    assert aut.response_date is not None


test_insurer_criacao = test_insurer_creation
test_coverage_plan_percentual = test_coverage_plan_percentage
test_autorizacao_fluxo = test_authorization_flow
