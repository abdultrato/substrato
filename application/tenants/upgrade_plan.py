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
    def execute(tenant, novo_type_plan: str, imediato: bool = True):

        assinatura_atual = tenant.get_active_subscription()

        if not assinatura_atual:
            raise Exception("Tenant não possui assinatura active.")

        if assinatura_atual.plan.type == novo_type_plan:
            return assinatura_atual

        novo_plan = SubscriptionPlan.objects.filter(
            type=novo_type_plan,
            active=True,
        ).first()

        if not novo_plan:
            raise Exception("Plano inválido ou inativo.")

        hoje = timezone.now().date()

        if imediato:
            # Cancela imediatamente
            assinatura_atual.cancelar(end_date=hoje)

            return TenantSubscription.objects.create(
                tenant=tenant,
                plan=novo_plan,
                start_date=hoje,
                status=TenantSubscription.Status.ATIVA,
                cycle=assinatura_atual.cycle,
            )

        # Upgrade programado no fim do cycle
        end_date_atual = assinatura_atual.end_date or hoje

        assinatura_atual.cancelar(end_date=end_date_atual)

        return TenantSubscription.objects.create(
            tenant=tenant,
            plan=novo_plan,
            start_date=end_date_atual,
            status=TenantSubscription.Status.ATIVA,
            cycle=assinatura_atual.cycle,
        )


UpgradePlanoUseCase = UpgradePlanUseCase
UpgradePlanUseCase.executar = UpgradePlanUseCase.execute
