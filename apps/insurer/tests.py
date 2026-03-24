from decimal import Decimal

import pytest

from apps.tenants.models.tenant import Tenant
from apps.insurer.models.procedure_authorization import ProcedureAuthorization
from apps.insurer.models.coverage_plan import CoveragePlan
from apps.insurer.models.insurer import Insurer


def _tenant():
    return Tenant.objects.create(identificador="tn-seg", nome="Tenant Seg")


@pytest.mark.django_db
def test_seguradora_criacao():
    tenant = _tenant()
    seg = Insurer.objects.create(inquilino=tenant, nome="Seguro X", email="seg@example.com")
    assert seg.pk
    assert seg.ativa is True


@pytest.mark.django_db
def test_plano_cobertura_percentual():
    tenant = _tenant()
    seg = Insurer.objects.create(inquilino=tenant, nome="Seguro Y")
    plano = CoveragePlan.objects.create(
        inquilino=tenant,
        seguradora=seg,
        nome="Plano Ouro",
        percentual_cobertura=Decimal("80.00"),
        exige_autorizacao=True,
    )
    assert plano.percentual_final() == Decimal("80.00")
    assert plano.exige_autorizacao is True


@pytest.mark.django_db
def test_autorizacao_fluxo():
    tenant = _tenant()
    seg = Insurer.objects.create(inquilino=tenant, nome="Seguro Z")
    plano = CoveragePlan.objects.create(
        inquilino=tenant, seguradora=seg, nome="Plano Prata", percentual_cobertura=Decimal("50.00")
    )
    aut = ProcedureAuthorization.objects.create(
        inquilino=tenant,
        plano=plano,
        requisicao_id="REQ123",
        status=ProcedureAuthorization.Status.PENDENTE,
    )
    aut.marcar_resposta(ProcedureAuthorization.Status.APROVADA, codigo_autorizacao="AUTH-001")
    aut.refresh_from_db()
    assert aut.status == ProcedureAuthorization.Status.APROVADA
    assert aut.codigo_autorizacao == "AUTH-001"
    assert aut.data_resposta is not None
