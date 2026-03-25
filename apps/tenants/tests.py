from datetime import timedelta

from django.db import IntegrityError
from django.utils import timezone
import pytest

from apps.tenants.models.configuration import TenantConfiguration
from apps.tenants.models.feature_flags import TenantFeatureFlag
from apps.tenants.models.subscription import TenantSubscription
from apps.tenants.models.subscription_plan import SubscriptionPlan
from apps.tenants.models.tenant import Tenant
from apps.tenants.models.tenant_usage import TenantUsage


def _tenant():
    return Tenant.objects.create(
        identifier="tn-tests",
        name="Tenant Tests",
        trial_until=timezone.localdate() + timedelta(days=7),
    )


@pytest.mark.django_db
def test_tenant_trial_and_blocking():
    tenant = _tenant()
    assert tenant.esta_em_trial() is True
    assert tenant.esta_bloqueado() is False

    tenant.commercial_status = Tenant.StatusComercial.ATIVO
    tenant.blocked_at = timezone.now()
    tenant.save()

    assert tenant.esta_em_trial() is False
    assert tenant.esta_bloqueado() is True


@pytest.mark.django_db
def test_active_plan_returns_from_subscription():
    tenant = _tenant()
    plan_basic = SubscriptionPlan.objects.create(name="Basic", type=SubscriptionPlan.PlanType.BASIC)
    plan_pro = SubscriptionPlan.objects.create(name="Pro", type=SubscriptionPlan.PlanType.PRO)

    TenantSubscription.objects.create(
        tenant=tenant,
        plan=plan_basic,
        status=TenantSubscription.Status.CANCELED,
        start_date=timezone.localdate() - timedelta(days=30),
        end_date=timezone.localdate() - timedelta(days=1),
    )
    assinatura_active = TenantSubscription.objects.create(
        tenant=tenant,
        plan=plan_pro,
        status=TenantSubscription.Status.ACTIVE,
        start_date=timezone.localdate(),
    )

    assert tenant.plan == plan_pro
    assert tenant.get_active_subscription() == assinatura_active


@pytest.mark.django_db
def test_assinatura_cancelar_define_status_e_end_date():
    tenant = _tenant()
    plan = SubscriptionPlan.objects.create(name="Free", type=SubscriptionPlan.PlanType.FREE)
    assinatura = TenantSubscription.objects.create(tenant=tenant, plan=plan)

    assinatura.cancel()

    assert assinatura.status == TenantSubscription.Status.CANCELED
    assert assinatura.end_date == timezone.localdate()


@pytest.mark.django_db
def test_feature_flag_unique_per_tenant():
    tenant = _tenant()
    TenantFeatureFlag.objects.create(tenant=tenant, key="beta-ui")
    with pytest.raises(IntegrityError):
        TenantFeatureFlag.objects.create(tenant=tenant, key="beta-ui")


@pytest.mark.django_db
def test_tenant_configuration_defaults():
    tenant = _tenant()
    cfg = TenantConfiguration.objects.create(tenant=tenant)

    assert cfg.currency == "MZN"
    assert cfg.language == "pt"
    assert cfg.time_zone == "Africa/Maputo"
    assert cfg.tenant == tenant


@pytest.mark.django_db
def test_uso_tenant_repr():
    tenant = _tenant()
    uso = TenantUsage.objects.create(
        tenant=tenant,
        active_users=3,
        current_month_requests=25,
    )

    assert "Uso" in str(uso)
    assert str(uso).endswith(str(tenant.id))


