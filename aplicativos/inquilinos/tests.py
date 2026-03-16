from datetime import timedelta

from django.db import IntegrityError
from django.utils import timezone
import pytest

from aplicativos.inquilinos.modelos.assinatura import AssinaturaTenant
from aplicativos.inquilinos.modelos.configuracao import ConfiguracaoInquilino
from aplicativos.inquilinos.modelos.feature_flags import FeatureFlagTenant
from aplicativos.inquilinos.modelos.inquilino import Inquilino
from aplicativos.inquilinos.modelos.plano_assinatura import PlanoAssinatura
from aplicativos.inquilinos.modelos.uso_tenant import UsoTenant


def _tenant():
    return Inquilino.objects.create(
        identificador="tn-tests",
        nome="Tenant Tests",
        trial_ate=timezone.localdate() + timedelta(days=7),
    )


@pytest.mark.django_db
def test_inquilino_trial_e_bloqueio():
    tenant = _tenant()
    assert tenant.esta_em_trial() is True
    assert tenant.esta_bloqueado() is False

    tenant.status_comercial = Inquilino.StatusComercial.ATIVO
    tenant.bloqueado_em = timezone.now()
    tenant.save()

    assert tenant.esta_em_trial() is False
    assert tenant.esta_bloqueado() is True


@pytest.mark.django_db
def test_plano_ativo_retorna_da_assinatura():
    tenant = _tenant()
    plano_basic = PlanoAssinatura.objects.create(nome="Basic", tipo=PlanoAssinatura.TipoPlano.BASIC)
    plano_pro = PlanoAssinatura.objects.create(nome="Pro", tipo=PlanoAssinatura.TipoPlano.PRO)

    AssinaturaTenant.objects.create(
        inquilino=tenant,
        plano=plano_basic,
        status=AssinaturaTenant.Status.CANCELADA,
        data_inicio=timezone.localdate() - timedelta(days=30),
        data_fim=timezone.localdate() - timedelta(days=1),
    )
    assinatura_ativa = AssinaturaTenant.objects.create(
        inquilino=tenant,
        plano=plano_pro,
        status=AssinaturaTenant.Status.ATIVA,
        data_inicio=timezone.localdate(),
    )

    assert tenant.plano == plano_pro
    assert tenant.obter_assinatura_ativa() == assinatura_ativa


@pytest.mark.django_db
def test_assinatura_cancelar_define_status_e_data_fim():
    tenant = _tenant()
    plano = PlanoAssinatura.objects.create(nome="Free", tipo=PlanoAssinatura.TipoPlano.FREE)
    assinatura = AssinaturaTenant.objects.create(inquilino=tenant, plano=plano)

    assinatura.cancelar()

    assert assinatura.status == AssinaturaTenant.Status.CANCELADA
    assert assinatura.data_fim == timezone.localdate()


@pytest.mark.django_db
def test_feature_flag_unica_por_inquilino():
    tenant = _tenant()
    FeatureFlagTenant.objects.create(inquilino=tenant, chave="beta-ui")
    with pytest.raises(IntegrityError):
        FeatureFlagTenant.objects.create(inquilino=tenant, chave="beta-ui")


@pytest.mark.django_db
def test_configuracao_inquilino_defaults():
    tenant = _tenant()
    cfg = ConfiguracaoInquilino.objects.create(inquilino=tenant)

    assert cfg.moeda == "MZN"
    assert cfg.idioma == "pt"
    assert cfg.fuso_horario == "Africa/Maputo"
    assert cfg.inquilino == tenant


@pytest.mark.django_db
def test_uso_tenant_repr():
    tenant = _tenant()
    uso = UsoTenant.objects.create(
        inquilino=tenant,
        usuarios_ativos=3,
        requisicoes_mes_atual=25,
    )

    assert "Uso" in str(uso)
    assert str(uso).endswith(str(tenant.id))
