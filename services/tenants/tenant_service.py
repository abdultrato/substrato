from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from apps.tenants.models import (
    SubscriptionPlan,
    Tenant,
    TenantConfiguration,
    TenantSubscription,
    TenantUsage,
)


class TenantService:
    """
    Orchestrates tenant bootstrap with the default free plan.
    """

    TRIAL_DAYS = 14

    @transaction.atomic
    def create(self, name: str, domain: str):
        normalized_domain = (domain or "").lower().strip()
        if not normalized_domain:
            raise ValueError("Tenant domain is required.")

        existing_tenant = Tenant.objects.filter(identifier=normalized_domain).first()
        if existing_tenant:
            return existing_tenant

        free_plan = SubscriptionPlan.objects.filter(
            type=SubscriptionPlan.PlanType.FREE,
            active=True,
        ).first()
        if not free_plan:
            raise ValueError("Default FREE subscription plan is not configured.")

        today = timezone.localdate()
        tenant = Tenant.objects.create(
            name=name,
            identifier=normalized_domain,
            domain=normalized_domain,
            commercial_status=Tenant.CommercialStatus.TRIAL,
            trial_until=today + timedelta(days=self.TRIAL_DAYS),
        )

        TenantSubscription.objects.create(
            tenant=tenant,
            plan=free_plan,
            start_date=today,
            status=TenantSubscription.Status.ACTIVE,
            cycle=TenantSubscription.BillingCycle.MONTHLY,
        )
        TenantConfiguration.objects.create(tenant=tenant)
        TenantUsage.objects.create(tenant=tenant)

        return tenant


