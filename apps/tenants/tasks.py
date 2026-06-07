"""Tarefas Celery do domínio de tenants (cobrança recorrente de assinaturas)."""

import logging

from celery import shared_task

logger = logging.getLogger("billing.subscriptions")


@shared_task(
    name="apps.tenants.tasks.run_subscription_billing_cycle",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def run_subscription_billing_cycle(self):
    """Cobra todas as assinaturas vencidas e aplica dunning/suspensão.

    Idempotente: faturas já pagas não são recobradas e cobranças em curso não
    são duplicadas, por isso é seguro reexecutar.
    """
    from apps.tenants.services.billing import BillingService

    try:
        stats = BillingService.run_billing_cycle()
        logger.info("Ciclo de cobrança de assinaturas concluído: %s", stats)
        return stats
    except Exception as exc:  # noqa: BLE001
        logger.exception("Falha no ciclo de cobrança de assinaturas")
        raise self.retry(exc=exc)


@shared_task(name="apps.tenants.tasks.reconcile_subscription_charges")
def reconcile_subscription_charges():
    """Reconcilia cobranças pendentes consultando o estado no gateway."""
    from apps.tenants.services.billing import BillingService

    settled = BillingService.reconcile()
    logger.info("Reconciliação de cobranças concluída: %s liquidadas", settled)
    return {"settled": settled}
