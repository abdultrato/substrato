from decimal import Decimal

import pytest

from aplicativos.inquilinos.modelos.inquilino import Inquilino
from aplicativos.seguradora.modelos.autorizacao import AutorizacaoProcedimento
from aplicativos.seguradora.modelos.plano_cobertura import PlanoCobertura
from aplicativos.seguradora.modelos.seguradora import Seguradora


def _tenant():
    return Inquilino.objects.create(identificador="tn-seg", nome="Tenant Seg")


@pytest.mark.django_db
def test_seguradora_criacao():
    tenant = _tenant()
    seg = Seguradora.objects.create(inquilino=tenant, nome="Seguro X", email="seg@example.com")
    assert seg.pk
    assert seg.ativa is True


@pytest.mark.django_db
def test_plano_cobertura_percentual():
    tenant = _tenant()
    seg = Seguradora.objects.create(inquilino=tenant, nome="Seguro Y")
    plano = PlanoCobertura.objects.create(
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
    seg = Seguradora.objects.create(inquilino=tenant, nome="Seguro Z")
    plano = PlanoCobertura.objects.create(
        inquilino=tenant, seguradora=seg, nome="Plano Prata", percentual_cobertura=Decimal("50.00")
    )
    aut = AutorizacaoProcedimento.objects.create(
        inquilino=tenant,
        plano=plano,
        requisicao_id="REQ123",
        status=AutorizacaoProcedimento.Status.PENDENTE,
    )
    aut.marcar_resposta(AutorizacaoProcedimento.Status.APROVADA, codigo_autorizacao="AUTH-001")
    aut.refresh_from_db()
    assert aut.status == AutorizacaoProcedimento.Status.APROVADA
    assert aut.codigo_autorizacao == "AUTH-001"
    assert aut.data_resposta is not None
