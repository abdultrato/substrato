"""Onboarding self-service e venda assistida (modelo híbrido).

`register` cria, numa transação atómica: tenant → usuário admin → assinatura
(trial ou ativa). `checkout` cobra o primeiro período via gateway. O mesmo
serviço alimenta tanto o signup público quanto a criação assistida pelo admin.
"""

from __future__ import annotations

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils.text import slugify

from apps.tenants.models.subscription import TenantSubscription
from apps.tenants.models.subscription_plan import SubscriptionPlan
from apps.tenants.models.tenant import Tenant
from apps.tenants.services.billing import BillingService

User = get_user_model()


def _unique_identifier(name: str) -> str:
    base = slugify(name) or "tenant"
    base = base[:70]
    identifier = base
    suffix = 2
    while Tenant.all_objects.filter(identifier=identifier).exists():
        identifier = f"{base}-{suffix}"
        suffix += 1
    return identifier


def _resolve_plan(plan=None, plan_type=None) -> SubscriptionPlan:
    if plan is not None:
        return plan
    qs = SubscriptionPlan.objects.filter(active=True)
    if plan_type:
        found = qs.filter(type=plan_type).order_by("order", "id").first()
        if found:
            return found
    found = qs.order_by("order", "id").first()
    if found is None:
        raise ValueError("Nenhum plano de assinatura ativo disponível.")
    return found


def _grant_admin(user) -> None:
    try:
        from django.contrib.auth.models import Group

        from security.permissions.rbac import GROUPS as RBAC_GROUPS

        admin_group, _ = Group.objects.get_or_create(name=RBAC_GROUPS["ADMIN"])
        user.groups.add(admin_group)
    except Exception:  # noqa: BLE001
        # Onboarding resiliente mesmo sem RBAC pronto.
        return


class OnboardingService:
    @classmethod
    @transaction.atomic
    def register(cls, *, company_name, admin_email, admin_password,
                 admin_name="", plan=None, plan_type=None, cycle=None, trial_days=None):
        """Cria tenant + admin + assinatura. Devolve dict com os três objetos."""
        cycle = cycle or TenantSubscription.BillingCycle.MONTHLY
        plan = _resolve_plan(plan=plan, plan_type=plan_type)

        tenant = Tenant.objects.create(
            identifier=_unique_identifier(company_name),
            name=company_name,
        )

        user = User(
            username=admin_email,
            email=admin_email,
            first_name=admin_name or "",
            is_staff=True,
            tenant=tenant,
        )
        user.set_password(admin_password)
        user.save()
        _grant_admin(user)

        subscription = BillingService.start_subscription(
            tenant, plan, cycle=cycle, trial_days=trial_days)

        return {"tenant": tenant, "user": user, "subscription": subscription}

    @classmethod
    def checkout(cls, subscription, *, gateway=None, phone=None, idempotency_key=None):
        """Cobra o período corrente (ou converte um trial) via gateway."""
        subscription.refresh_from_db()
        if subscription.status == TenantSubscription.Status.TRIALING:
            start, end = subscription.next_period_bounds()
            invoice = BillingService.open_invoice(
                subscription, period_start=start, period_end=end)
        else:
            invoice = BillingService.open_invoice(subscription)

        charge = BillingService.charge_invoice(
            invoice, gateway=gateway, phone=phone, idempotency_key=idempotency_key)

        invoice.refresh_from_db()
        subscription.refresh_from_db()
        return {"invoice": invoice, "charge": charge, "subscription": subscription}
