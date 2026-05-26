from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
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


@pytest.mark.django_db
def test_insurer_api_uses_english_resource_routes(api_client):
    tenant = Tenant.objects.create(
        identifier="tn-insurer-contracts",
        name="Tenant Insurer Contracts",
        domain="insurer-contracts.local",
        active=True,
    )
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username="insurer_contract_user",
        email="insurer-contract@example.com",
        password="testpass123",
        tenant=tenant,
    )
    admin_group, _ = Group.objects.get_or_create(name="Administrador")
    user.groups.add(admin_group)

    from api.v1.insurer.filters import FILTER_MAP
    from api.v1.insurer.serializers import SERIALIZER_MAP
    from api.v1.insurer.viewsets import VIEWSET_MAP

    expected = {"insurer", "coverage_plan", "tenant_coverage_plan", "procedure_authorization"}
    legacy = {"planocobertura", "tenantplanocobertura", "autorizacaoprocedimento"}

    assert set(VIEWSET_MAP) == expected
    assert set(SERIALIZER_MAP) == expected
    assert set(FILTER_MAP) == expected
    assert not (set(VIEWSET_MAP) & legacy)

    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=user)

    assert api_client.get("/api/v1/insurer/coverage_plan/").status_code == 200
    assert api_client.get("/api/v1/insurer/planocobertura/").status_code == 404


