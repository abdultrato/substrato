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
        existente = Tenant.objects.filter(identifier=identifier).first()

        if existente:
            return existente

        # Obtém plan FREE global
        plan_free = SubscriptionPlan.objects.filter(
            type=SubscriptionPlan.TipoPlano.FREE,
            active=True,
        ).first()

        if not plan_free:
            raise Exception("Plano FREE não configurado.")

        hoje = timezone.now().date()

        # Criação do tenant
        tenant = Tenant.objects.create(
            name=name,
            identifier=identifier,
            domain=domain,
            commercial_status=Tenant.StatusComercial.TRIAL,
            trial_until=hoje + timedelta(days=CreateTenantUseCase.TRIAL_DAYS),
        )

        # Criação da assinatura inicial
        TenantSubscription.objects.create(
            tenant=tenant,
            plan=plan_free,
            start_date=hoje,
            status=TenantSubscription.Status.ATIVA,
            cycle=TenantSubscription.Ciclo.MENSAL,
        )

        return tenant


CriarInquilinoUseCase = CreateTenantUseCase
CreateTenantUseCase.TRIAL_DIAS = CreateTenantUseCase.TRIAL_DAYS
CreateTenantUseCase.executar = CreateTenantUseCase.execute
