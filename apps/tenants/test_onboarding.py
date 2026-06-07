"""Testes do onboarding híbrido (signup self-service + checkout + webhook)."""

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
import pytest
from rest_framework.test import APIClient

from apps.tenants.models.subscription import TenantSubscription
from apps.tenants.models.subscription_invoice import SubscriptionInvoice
from apps.tenants.models.subscription_plan import SubscriptionPlan
from apps.tenants.models.tenant import Tenant
from apps.tenants.services.billing import BillingService
from apps.tenants.services.onboarding import OnboardingService
from integrations.payments.sandbox import SandboxGateway

User = get_user_model()


@pytest.fixture(autouse=True)
def _sandbox(settings):
    settings.PAYMENT_GATEWAY = "sandbox"
    settings.PAYMENT_SANDBOX_FORCE = ""
    settings.PAYMENT_WEBHOOK_SECRET = ""
    settings.SUBSCRIPTION_TRIAL_DAYS = 14
    settings.SUBSCRIPTION_MAX_FAILED_CHARGES = 3
    SandboxGateway.reset()
    yield
    SandboxGateway.reset()


def _plan(price="2000.00", ptype=SubscriptionPlan.PlanType.PRO, name="Pro"):
    return SubscriptionPlan.objects.create(name=name, type=ptype, monthly_price=Decimal(price))


# ---------------------------------------------------------------------------
# Serviço de onboarding
# ---------------------------------------------------------------------------
@pytest.mark.django_db
def test_register_cria_tenant_admin_e_assinatura():
    plan = _plan()
    result = OnboardingService.register(
        company_name="Clínica Aurora",
        admin_email="admin@aurora.co.mz",
        admin_password="senha-super-forte-1",
        admin_name="Ana",
        plan=plan,
    )

    tenant = result["tenant"]
    user = result["user"]
    subscription = result["subscription"]

    assert Tenant.objects.filter(pk=tenant.pk).exists()
    assert tenant.identifier == "clinica-aurora"
    assert user.tenant_id == tenant.pk
    assert user.check_password("senha-super-forte-1")
    assert user.is_staff is True
    assert subscription.plan_id == plan.pk
    assert subscription.status == TenantSubscription.Status.TRIALING


@pytest.mark.django_db
def test_register_identifier_unico_para_nomes_repetidos():
    plan = _plan()
    a = OnboardingService.register(company_name="Hospital Central", admin_email="a@h.mz",
                                   admin_password="senha-forte-123", plan=plan)
    b = OnboardingService.register(company_name="Hospital Central", admin_email="b@h.mz",
                                   admin_password="senha-forte-123", plan=plan)
    assert a["tenant"].identifier == "hospital-central"
    assert b["tenant"].identifier == "hospital-central-2"


@pytest.mark.django_db
def test_checkout_converte_trial_em_pago(settings):
    settings.PAYMENT_SANDBOX_FORCE = "succeed"
    plan = _plan()
    result = OnboardingService.register(company_name="Lab Beta", admin_email="c@beta.mz",
                                        admin_password="senha-forte-123", plan=plan, trial_days=14)
    subscription = result["subscription"]
    assert subscription.status == TenantSubscription.Status.TRIALING

    out = OnboardingService.checkout(subscription)

    assert out["invoice"].status == SubscriptionInvoice.Status.PAID
    out["subscription"].refresh_from_db()
    assert out["subscription"].status == TenantSubscription.Status.ACTIVE


# ---------------------------------------------------------------------------
# Endpoints HTTP
# ---------------------------------------------------------------------------
@pytest.mark.django_db
def test_endpoint_planos_publicos_lista_ativos():
    _plan(price="0.00", ptype=SubscriptionPlan.PlanType.FREE, name="Free")
    _plan(price="2000.00", ptype=SubscriptionPlan.PlanType.PRO, name="Pro")
    SubscriptionPlan.objects.create(name="Oculto", type=SubscriptionPlan.PlanType.BASIC,
                                    monthly_price=Decimal("100.00"), active=False)

    resp = APIClient().get(reverse("onboarding-plans"))
    assert resp.status_code == 200
    names = {p["name"] for p in resp.json()}
    assert {"Free", "Pro"} <= names
    assert "Oculto" not in names


@pytest.mark.django_db
def test_endpoint_signup_cria_conta_e_devolve_tokens():
    _plan()
    payload = {
        "company_name": "Farmácia Sol",
        "admin_name": "Beto",
        "email": "owner@sol.mz",
        "password": "senha-super-forte-1",
    }
    resp = APIClient().post(reverse("onboarding-signup"), payload, format="json")
    assert resp.status_code == 201, resp.content
    body = resp.json()
    assert body["access"] and body["refresh"]
    assert body["tenant"]["identifier"] == "farmacia-sol"
    assert User.objects.filter(email="owner@sol.mz").exists()


@pytest.mark.django_db
def test_endpoint_signup_email_duplicado_400():
    _plan()
    payload = {"company_name": "Dup", "email": "dup@x.mz", "password": "senha-super-forte-1"}
    c = APIClient()
    assert c.post(reverse("onboarding-signup"), payload, format="json").status_code == 201
    second = c.post(reverse("onboarding-signup"),
                    {**payload, "company_name": "Dup2"}, format="json")
    assert second.status_code == 400


@pytest.mark.django_db
def test_endpoint_webhook_liquida_cobranca(settings):
    settings.PAYMENT_SANDBOX_FORCE = "pending"
    plan = _plan()
    result = OnboardingService.register(company_name="Clínica Web", admin_email="w@web.mz",
                                        admin_password="senha-forte-123", plan=plan, trial_days=0)
    invoice = BillingService.open_invoice(result["subscription"])
    charge = BillingService.charge_invoice(invoice)
    assert charge.status == "PENDENTE"

    payload = SandboxGateway.simulate_webhook(charge.external_reference, status="succeeded")
    resp = APIClient().post(reverse("payments-webhook"), payload, format="json")

    assert resp.status_code == 200
    assert resp.json()["processed"] is True
    invoice.refresh_from_db()
    assert invoice.status == SubscriptionInvoice.Status.PAID
