from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from apps.tenants.models.subscription import TenantSubscription
from apps.tenants.models.subscription_plan import SubscriptionPlan
from apps.tenants.models.tenant import Tenant


class CreateTenantUseCase:
    """
    Onboarding oficial de tenant.

    ✔ Transacional
    ✔ Cria assinatura automaticamente
    ✔ Define trial
    ✔ Usa plan FREE padrão
    ✔ Idempotente por identifier
    """

    TRIAL_DAYS = 14

    @staticmethod
    @transaction.atomic
    def execute(name: str, identifier: str, domain: str | None = None):

        # Evita duplicação
        existing_tenant = Tenant.objects.filter(identifier=identifier).first()

        if existing_tenant:
            return existing_tenant

        # Obtém plan FREE global
        plan_free = SubscriptionPlan.objects.filter(
            type=SubscriptionPlan.PlanType.FREE,
            active=True,
        ).first()

        if not plan_free:
            raise Exception("Plano FREE não configurado.")

        today = timezone.now().date()

        # Criação do tenant
        tenant = Tenant.objects.create(
            name=name,
            identifier=identifier,
            domain=domain,
            commercial_status=Tenant.CommercialStatus.TRIAL,
            trial_until=today + timedelta(days=CreateTenantUseCase.TRIAL_DAYS),
        )

        # Criação da assinatura inicial
        TenantSubscription.objects.create(
            tenant=tenant,
            plan=plan_free,
            start_date=today,
            status=TenantSubscription.Status.ACTIVE,
            cycle=TenantSubscription.BillingCycle.MONTHLY,
        )

        return tenant
