from django.db import transaction
from django.utils import timezone

from apps.tenants.models.subscription import TenantSubscription
from apps.tenants.models.subscription_plan import SubscriptionPlan


class UpgradePlanUseCase:
    """
    Upgrade / Downgrade de plan.

    ✔ Transacional
    ✔ Cancela assinatura anterior
    ✔ Cria nova assinatura
    ✔ Garante apenas uma active
    ✔ Compatível com billing
    """

    @staticmethod
    @transaction.atomic
    def execute(tenant, new_plan_type: str, immediate: bool = True):

        current_subscription = tenant.get_active_subscription()

        if not current_subscription:
            raise Exception("Tenant não possui assinatura active.")

        if current_subscription.plan.type == new_plan_type:
            return current_subscription

        new_plan = SubscriptionPlan.objects.filter(
            type=new_plan_type,
            active=True,
        ).first()

        if not new_plan:
            raise Exception("Plano inválido ou inativo.")

        today = timezone.now().date()

        if immediate:
            # Cancela imediatamente
            current_subscription.cancel(end_date=today)

            return TenantSubscription.objects.create(
                tenant=tenant,
                plan=new_plan,
                start_date=today,
                status=TenantSubscription.Status.ACTIVE,
                cycle=current_subscription.cycle,
            )

        # Upgrade programado no fim do cycle
        current_end_date = current_subscription.end_date or today

        current_subscription.cancel(end_date=current_end_date)

        return TenantSubscription.objects.create(
            tenant=tenant,
            plan=new_plan,
            start_date=current_end_date,
            status=TenantSubscription.Status.ACTIVE,
            cycle=current_subscription.cycle,
        )
