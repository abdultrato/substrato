from datetime import timedelta

from django.db import IntegrityError
from django.utils import timezone
import pytest

from apps.tenants.models.subscription import TenantSubscription
from apps.tenants.models.configuration import TenantConfiguration
from apps.tenants.models.feature_flags import TenantFeatureFlag
from apps.tenants.models.tenant import Tenant
from apps.tenants.models.subscription_plan import SubscriptionPlan
from apps.tenants.models.tenant_usage import TenantUsage


def _tenant():
    return Tenant.objects.create(
        identificador="tn-tests",
        nome="Tenant Tests",
        trial_ate=timezone.localdate() + timedelta(days=7),
    )


@pytest.mark.django_db
def test_inquilino_trial_e_bloqueio():
    tenant = _tenant()
    assert tenant.esta_em_trial() is True
    assert tenant.esta_bloqueado() is False

    tenant.status_comercial = Tenant.StatusComercial.ATIVO
    tenant.bloqueado_em = timezone.now()
    tenant.save()

    assert tenant.esta_em_trial() is False
    assert tenant.esta_bloqueado() is True


@pytest.mark.django_db
def test_plano_ativo_retorna_da_assinatura():
    tenant = _tenant()
    plano_basic = SubscriptionPlan.objects.create(nome="Basic", tipo=SubscriptionPlan.TipoPlano.BASIC)
    plano_pro = SubscriptionPlan.objects.create(nome="Pro", tipo=SubscriptionPlan.TipoPlano.PRO)

    TenantSubscription.objects.create(
        inquilino=tenant,
        plano=plano_basic,
        status=TenantSubscription.Status.CANCELADA,
        data_inicio=timezone.localdate() - timedelta(days=30),
        data_fim=timezone.localdate() - timedelta(days=1),
    )
    assinatura_ativa = TenantSubscription.objects.create(
        inquilino=tenant,
        plano=plano_pro,
        status=TenantSubscription.Status.ATIVA,
        data_inicio=timezone.localdate(),
    )

    assert tenant.plano == plano_pro
    assert tenant.obter_assinatura_ativa() == assinatura_ativa


@pytest.mark.django_db
def test_assinatura_cancelar_define_status_e_data_fim():
    tenant = _tenant()
    plano = SubscriptionPlan.objects.create(nome="Free", tipo=SubscriptionPlan.TipoPlano.FREE)
    assinatura = TenantSubscription.objects.create(inquilino=tenant, plano=plano)

    assinatura.cancelar()

    assert assinatura.status == TenantSubscription.Status.CANCELADA
    assert assinatura.data_fim == timezone.localdate()


@pytest.mark.django_db
def test_feature_flag_unica_por_inquilino():
    tenant = _tenant()
    TenantFeatureFlag.objects.create(inquilino=tenant, chave="beta-ui")
    with pytest.raises(IntegrityError):
        TenantFeatureFlag.objects.create(inquilino=tenant, chave="beta-ui")


@pytest.mark.django_db
def test_configuracao_inquilino_defaults():
    tenant = _tenant()
    cfg = TenantConfiguration.objects.create(inquilino=tenant)

    assert cfg.moeda == "MZN"
    assert cfg.idioma == "pt"
    assert cfg.fuso_horario == "Africa/Maputo"
    assert cfg.inquilino == tenant


@pytest.mark.django_db
def test_uso_tenant_repr():
    tenant = _tenant()
    uso = TenantUsage.objects.create(
        inquilino=tenant,
        usuarios_ativos=3,
        requisicoes_mes_atual=25,
    )

    assert "Uso" in str(uso)
    assert str(uso).endswith(str(tenant.id))
