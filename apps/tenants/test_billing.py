"""Testes do motor de cobrança de assinaturas (Passo 2).

Cobrem o núcleo de confiança da monetização: idempotência, ciclo de vida da
assinatura, dunning/suspensão, webhook e reconciliação — usando o SandboxGateway.
"""

from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
import pytest

from apps.tenants.models.subscription import TenantSubscription
from apps.tenants.models.subscription_charge import SubscriptionCharge
from apps.tenants.models.subscription_invoice import SubscriptionInvoice
from apps.tenants.models.subscription_plan import SubscriptionPlan
from apps.tenants.models.tenant import Tenant
from apps.tenants.services.billing import BillingService
from integrations.payments.sandbox import SandboxGateway


@pytest.fixture(autouse=True)
def _sandbox(settings):
    """Sandbox determinístico e isolado por teste."""
    settings.PAYMENT_GATEWAY = "sandbox"
    settings.PAYMENT_SANDBOX_FORCE = ""
    settings.SUBSCRIPTION_MAX_FAILED_CHARGES = 3
    settings.SUBSCRIPTION_TRIAL_DAYS = 14
    SandboxGateway.reset()
    yield
    SandboxGateway.reset()


def _tenant(identifier="tn-bill"):
    return Tenant.objects.create(identifier=identifier, name="Cliente Billing")


def _plan(price="1500.00", ptype=SubscriptionPlan.PlanType.PRO):
    return SubscriptionPlan.objects.create(
        name=f"Plano {price}", type=ptype, monthly_price=Decimal(price))


# ---------------------------------------------------------------------------
# Assinatura / trial
# ---------------------------------------------------------------------------
@pytest.mark.django_db
def test_start_subscription_com_trial():
    tenant = _tenant()
    plan = _plan()
    sub = BillingService.start_subscription(tenant, plan, trial_days=14)

    assert sub.status == TenantSubscription.Status.TRIALING
    assert sub.current_period_end == timezone.localdate() + timedelta(days=14)
    assert sub.next_billing_at == sub.current_period_end
    tenant.refresh_from_db()
    assert tenant.commercial_status == Tenant.CommercialStatus.TRIAL
    assert tenant.trial_until == sub.current_period_end


@pytest.mark.django_db
def test_start_subscription_sem_trial_fica_ativa():
    sub = BillingService.start_subscription(_tenant(), _plan(), trial_days=0)
    assert sub.status == TenantSubscription.Status.ACTIVE
    assert sub.next_billing_at is not None


# ---------------------------------------------------------------------------
# Faturas (idempotência de geração)
# ---------------------------------------------------------------------------
@pytest.mark.django_db
def test_open_invoice_idempotente():
    sub = BillingService.start_subscription(_tenant(), _plan(), trial_days=0)
    inv1 = BillingService.open_invoice(sub)
    inv2 = BillingService.open_invoice(sub)
    assert inv1.pk == inv2.pk
    assert SubscriptionInvoice.objects.filter(subscription=sub).count() == 1
    assert inv1.amount == Decimal("1500.00")


# ---------------------------------------------------------------------------
# Cobrança (sucesso, idempotência)
# ---------------------------------------------------------------------------
@pytest.mark.django_db
def test_charge_sucesso_marca_paga_e_ativa(settings):
    settings.PAYMENT_SANDBOX_FORCE = "succeed"
    tenant = _tenant()
    sub = BillingService.start_subscription(tenant, _plan(), trial_days=0)
    invoice = BillingService.open_invoice(sub)

    charge = BillingService.charge_invoice(invoice)

    assert charge.status == SubscriptionCharge.Status.SUCCEEDED
    invoice.refresh_from_db()
    assert invoice.status == SubscriptionInvoice.Status.PAID
    sub.refresh_from_db()
    assert sub.status == TenantSubscription.Status.ACTIVE
    assert sub.current_period_start == invoice.period_start


@pytest.mark.django_db
def test_charge_fatura_paga_nao_cobra_de_novo(settings):
    settings.PAYMENT_SANDBOX_FORCE = "succeed"
    sub = BillingService.start_subscription(_tenant(), _plan(), trial_days=0)
    invoice = BillingService.open_invoice(sub)

    first = BillingService.charge_invoice(invoice)
    second = BillingService.charge_invoice(invoice)

    assert first.pk == second.pk
    assert SubscriptionCharge.objects.filter(invoice=invoice).count() == 1


@pytest.mark.django_db
def test_charge_idempotency_key_explicita(settings):
    settings.PAYMENT_SANDBOX_FORCE = "succeed"
    sub = BillingService.start_subscription(_tenant(), _plan(), trial_days=0)
    invoice = BillingService.open_invoice(sub)

    c1 = BillingService.charge_invoice(invoice, idempotency_key="checkout-abc")
    c2 = BillingService.charge_invoice(invoice, idempotency_key="checkout-abc")
    assert c1.pk == c2.pk
    assert SubscriptionCharge.objects.filter(idempotency_key="checkout-abc").count() == 1


# ---------------------------------------------------------------------------
# Dunning → suspensão e recuperação
# ---------------------------------------------------------------------------
@pytest.mark.django_db
def test_falhas_consecutivas_suspendem_tenant(settings):
    settings.PAYMENT_SANDBOX_FORCE = "fail"
    settings.SUBSCRIPTION_MAX_FAILED_CHARGES = 3
    tenant = _tenant()
    sub = BillingService.start_subscription(tenant, _plan(), trial_days=0)

    for _ in range(3):
        invoice = BillingService.open_invoice(sub)
        BillingService.charge_invoice(invoice)
        sub.refresh_from_db()

    assert sub.status == TenantSubscription.Status.SUSPENDED
    tenant.refresh_from_db()
    assert tenant.commercial_status == Tenant.CommercialStatus.SUSPENDED
    assert tenant.blocked_at is not None


@pytest.mark.django_db
def test_uma_falha_fica_past_due_nao_suspende(settings):
    settings.PAYMENT_SANDBOX_FORCE = "fail"
    settings.SUBSCRIPTION_MAX_FAILED_CHARGES = 3
    sub = BillingService.start_subscription(_tenant(), _plan(), trial_days=0)
    BillingService.charge_invoice(BillingService.open_invoice(sub))
    sub.refresh_from_db()
    assert sub.status == TenantSubscription.Status.PAST_DUE
    assert sub.failed_charges == 1


@pytest.mark.django_db
def test_pagamento_apos_suspensao_reativa(settings):
    settings.SUBSCRIPTION_MAX_FAILED_CHARGES = 1
    tenant = _tenant()
    sub = BillingService.start_subscription(tenant, _plan(), trial_days=0)

    # Falha → suspende
    settings.PAYMENT_SANDBOX_FORCE = "fail"
    BillingService.charge_invoice(BillingService.open_invoice(sub))
    sub.refresh_from_db()
    assert sub.status == TenantSubscription.Status.SUSPENDED

    # Sucesso → reativa
    settings.PAYMENT_SANDBOX_FORCE = "succeed"
    BillingService.charge_invoice(BillingService.open_invoice(sub))
    sub.refresh_from_db()
    tenant.refresh_from_db()
    assert sub.status == TenantSubscription.Status.ACTIVE
    assert tenant.commercial_status == Tenant.CommercialStatus.ACTIVE
    assert tenant.blocked_at is None


# ---------------------------------------------------------------------------
# Webhook / reconciliação
# ---------------------------------------------------------------------------
@pytest.mark.django_db
def test_webhook_liquida_cobranca_pendente(settings):
    settings.PAYMENT_SANDBOX_FORCE = "pending"
    sub = BillingService.start_subscription(_tenant(), _plan(), trial_days=0)
    invoice = BillingService.open_invoice(sub)
    charge = BillingService.charge_invoice(invoice)

    assert charge.status == SubscriptionCharge.Status.PENDING
    invoice.refresh_from_db()
    assert invoice.status == SubscriptionInvoice.Status.OPEN

    payload = SandboxGateway.simulate_webhook(charge.external_reference, status="succeeded")
    settled = BillingService.apply_webhook(payload)

    assert settled.pk == charge.pk
    charge.refresh_from_db()
    invoice.refresh_from_db()
    assert charge.status == SubscriptionCharge.Status.SUCCEEDED
    assert invoice.status == SubscriptionInvoice.Status.PAID


@pytest.mark.django_db
def test_webhook_repetido_e_idempotente(settings):
    settings.PAYMENT_SANDBOX_FORCE = "pending"
    sub = BillingService.start_subscription(_tenant(), _plan(), trial_days=0)
    charge = BillingService.charge_invoice(BillingService.open_invoice(sub))

    payload = SandboxGateway.simulate_webhook(charge.external_reference, status="succeeded")
    BillingService.apply_webhook(payload)
    BillingService.apply_webhook(payload)  # repetido

    assert SubscriptionCharge.objects.filter(invoice=charge.invoice,
                                             status=SubscriptionCharge.Status.SUCCEEDED).count() == 1


@pytest.mark.django_db
def test_reconcile_liquida_pendentes(settings):
    settings.PAYMENT_SANDBOX_FORCE = "pending"
    sub = BillingService.start_subscription(_tenant(), _plan(), trial_days=0)
    charge = BillingService.charge_invoice(BillingService.open_invoice(sub))
    assert charge.status == SubscriptionCharge.Status.PENDING

    # O gateway passa a reportar sucesso para aquela transação.
    SandboxGateway.simulate_webhook(charge.external_reference, status="succeeded")
    settled = BillingService.reconcile()

    assert settled == 1
    charge.refresh_from_db()
    assert charge.status == SubscriptionCharge.Status.SUCCEEDED


# ---------------------------------------------------------------------------
# Ciclo recorrente
# ---------------------------------------------------------------------------
@pytest.mark.django_db
def test_run_billing_cycle_cobra_assinatura_vencida(settings):
    settings.PAYMENT_SANDBOX_FORCE = "succeed"
    sub = BillingService.start_subscription(_tenant(), _plan(), trial_days=0)
    # Força vencimento no passado.
    TenantSubscription.objects.filter(pk=sub.pk).update(
        next_billing_at=timezone.localdate() - timedelta(days=1))

    stats = BillingService.run_billing_cycle()

    assert stats["charged"] == 1
    sub.refresh_from_db()
    # Período avançou para o futuro.
    assert sub.next_billing_at > timezone.localdate()
    assert sub.status == TenantSubscription.Status.ACTIVE


@pytest.mark.django_db
def test_run_billing_cycle_plano_gratuito_avanca_sem_cobrar():
    plan_free = _plan(price="0.00", ptype=SubscriptionPlan.PlanType.FREE)
    sub = BillingService.start_subscription(_tenant(), plan_free, trial_days=0)
    TenantSubscription.objects.filter(pk=sub.pk).update(
        next_billing_at=timezone.localdate() - timedelta(days=1))

    stats = BillingService.run_billing_cycle()

    assert stats["free_rolled"] == 1
    assert stats["charged"] == 0
    assert SubscriptionInvoice.objects.filter(subscription=sub).count() == 0
