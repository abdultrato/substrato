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

        existing_tenant = Tenant.objects.filter(identificador=normalized_domain).first()
        if existing_tenant:
            return existing_tenant

        free_plan = SubscriptionPlan.objects.filter(
            tipo=SubscriptionPlan.PlanType.FREE,
            ativo=True,
        ).first()
        if not free_plan:
            raise ValueError("Default FREE subscription plan is not configured.")

        today = timezone.localdate()
        tenant = Tenant.objects.create(
            nome=name,
            identificador=normalized_domain,
            dominio=normalized_domain,
            status_comercial=Tenant.StatusComercial.TRIAL,
            trial_ate=today + timedelta(days=self.TRIAL_DAYS),
        )

        TenantSubscription.objects.create(
            inquilino=tenant,
            plano=free_plan,
            data_inicio=today,
            status=TenantSubscription.Status.ATIVA,
            ciclo=TenantSubscription.Ciclo.MENSAL,
        )
        TenantConfiguration.objects.create(inquilino=tenant)
        TenantUsage.objects.create(inquilino=tenant)

        return tenant


ServicoInquilino = TenantService
TenantService.criar = TenantService.create
TenantService.TRIAL_DIAS = TenantService.TRIAL_DAYS
