"""Motor de cobrança de assinaturas (plataforma → tenant).

Orquestra o ciclo completo, agnóstico de gateway:

    assinatura → fatura (período) → cobrança (gateway) → webhook/reconciliação
                                                       ↘ dunning → suspensão

Princípios:
- **Idempotência:** uma fatura por período; cada cobrança tem `idempotency_key`
  única; faturas pagas nunca são cobradas de novo; webhooks repetidos são no-op.
- **Resiliência:** a cobrança é persistida (PENDENTE) antes da chamada de rede,
  para que webhook/reconciliação recuperem o estado mesmo após uma falha.
- **Tenancy:** o `tenant` é sempre definido explicitamente (o motor corre fora
  de um request, em Celery).
"""

from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.tenants.models.subscription import TenantSubscription
from apps.tenants.models.subscription_charge import SubscriptionCharge
from apps.tenants.models.subscription_invoice import SubscriptionInvoice
from apps.tenants.models.tenant import Tenant
from integrations.payments.registry import get_gateway

# Normalização do vocabulário de estados devolvido por gateways heterogéneos.
_SUCCESS = {"succeeded", "success", "paid", "completed", "confirmed", "approved"}
_FAILURE = {"failed", "failure", "error", "declined", "canceled", "cancelled", "rejected"}


def classify_status(raw_status) -> str:
    s = (str(raw_status) if raw_status is not None else "").strip().lower()
    if s in _SUCCESS:
        return "succeeded"
    if s in _FAILURE:
        return "failed"
    return "pending"


class BillingService:
    """Serviço sem estado: todos os métodos são utilitários de classe."""

    # ------------------------------------------------------------------
    # Assinaturas
    # ------------------------------------------------------------------
    @classmethod
    def start_subscription(cls, tenant, plan, *, cycle=None, trial_days=None) -> TenantSubscription:
        """Cria uma assinatura e inicia o primeiro período (com/sem trial)."""
        cycle = cycle or TenantSubscription.BillingCycle.MONTHLY
        if trial_days is None:
            trial_days = int(getattr(settings, "SUBSCRIPTION_TRIAL_DAYS", 0) or 0)

        subscription = TenantSubscription(tenant=tenant, plan=plan, cycle=cycle)
        subscription.start_first_period(trial_days=trial_days)
        subscription.save()

        if subscription.status == TenantSubscription.Status.TRIALING:
            tenant.commercial_status = Tenant.CommercialStatus.TRIAL
            tenant.trial_until = subscription.current_period_end
            tenant.blocked_at = None
            tenant.save(update_fields=["commercial_status", "trial_until", "blocked_at"])
        else:
            tenant.commercial_status = Tenant.CommercialStatus.ACTIVE
            tenant.blocked_at = None
            tenant.save(update_fields=["commercial_status", "blocked_at"])
        return subscription

    # ------------------------------------------------------------------
    # Faturas
    # ------------------------------------------------------------------
    @classmethod
    def open_invoice(cls, subscription, *, period_start=None, period_end=None,
                     amount=None, due_date=None) -> SubscriptionInvoice:
        """Garante (idempotente) uma fatura para o período indicado.

        Por omissão usa o período atual da assinatura.
        """
        period_start = period_start or subscription.current_period_start or timezone.localdate()
        if period_end is None:
            period_end = subscription.current_period_end or period_start
        if amount is None:
            amount = subscription.price()
        amount = Decimal(amount)

        existing = (
            SubscriptionInvoice.objects
            .filter(subscription=subscription, period_start=period_start)
            .order_by("-created_at")
            .first()
        )
        if existing is not None:
            return existing

        return SubscriptionInvoice.objects.create(
            tenant=subscription.tenant,
            subscription=subscription,
            period_start=period_start,
            period_end=period_end,
            amount=amount,
            currency=getattr(settings, "CURRENCY", "MZN"),
            due_date=due_date or period_start,
            status=SubscriptionInvoice.Status.OPEN,
        )

    # ------------------------------------------------------------------
    # Cobrança
    # ------------------------------------------------------------------
    @classmethod
    def charge_invoice(cls, invoice, *, gateway=None, idempotency_key=None, phone=None) -> SubscriptionCharge | None:
        """Cobra uma fatura num gateway, de forma idempotente.

        Devolve a `SubscriptionCharge` resultante (ou a existente, em replays).
        """
        gateway_name = gateway or getattr(settings, "PAYMENT_GATEWAY", "sandbox") or "sandbox"

        with transaction.atomic():
            invoice = SubscriptionInvoice.all_objects.select_for_update().get(pk=invoice.pk)

            # Faturas pagas/anuladas não são cobradas de novo.
            if invoice.status in (SubscriptionInvoice.Status.PAID, SubscriptionInvoice.Status.VOID):
                return invoice.charges.filter(status=SubscriptionCharge.Status.SUCCEEDED).order_by("-created_at").first()

            # Replay explícito por idempotency_key.
            if idempotency_key:
                replay = SubscriptionCharge.all_objects.filter(idempotency_key=idempotency_key).first()
                if replay is not None:
                    return replay

            # Cobrança em curso para a fatura → não duplicar.
            pending = invoice.charges.filter(status=SubscriptionCharge.Status.PENDING).order_by("-created_at").first()
            if pending is not None:
                return pending

            if not idempotency_key:
                attempt = invoice.charges.count() + 1
                idempotency_key = f"sub:{invoice.subscription_id}:{invoice.period_start.isoformat()}:{attempt}"

            charge = SubscriptionCharge.objects.create(
                tenant=invoice.tenant,
                invoice=invoice,
                gateway=gateway_name,
                idempotency_key=idempotency_key,
                amount=invoice.amount,
                currency=invoice.currency,
                status=SubscriptionCharge.Status.PENDING,
            )

        # Chamada de rede FORA do lock (a cobrança PENDENTE já está persistida).
        reference = invoice.custom_id or f"SINV-{invoice.pk}"
        try:
            result = get_gateway(gateway_name).charge(
                invoice.amount, reference=reference, phone=phone, idempotency_key=idempotency_key,
            )
        except TypeError:
            # Gateways legados sem assinatura estendida (idempotency_key/phone).
            try:
                result = get_gateway(gateway_name).charge(invoice.amount, reference, phone)
            except Exception as exc:  # noqa: BLE001
                charge.mark_failed(response={"error": str(exc)})
                cls._on_charge_failed(charge)
                return charge
        except Exception as exc:  # noqa: BLE001
            charge.mark_failed(response={"error": str(exc)})
            cls._on_charge_failed(charge)
            return charge

        status = classify_status(result.get("status") if isinstance(result, dict) else result)
        external_reference = (result or {}).get("transaction_id", "") if isinstance(result, dict) else ""

        if status == "succeeded":
            # _settle_succeeded re-busca a cobrança (lock); usar o retorno fresco
            # evita devolver um objeto desatualizado (ainda PENDENTE em memória).
            charge = cls._settle_succeeded(charge, external_reference, result)
        elif status == "failed":
            charge.mark_failed(response=result if isinstance(result, dict) else {"raw": str(result)})
            cls._on_charge_failed(charge)
        else:
            # Pendente: aguarda webhook/reconciliação.
            charge.external_reference = external_reference
            charge.gateway_response = result if isinstance(result, dict) else {"raw": str(result)}
            charge.save(update_fields=["external_reference", "gateway_response"])

        return charge

    # ------------------------------------------------------------------
    # Liquidação / transições
    # ------------------------------------------------------------------
    @classmethod
    def _settle_succeeded(cls, charge, external_reference, raw):
        with transaction.atomic():
            charge = SubscriptionCharge.all_objects.select_for_update().get(pk=charge.pk)
            if charge.status == SubscriptionCharge.Status.SUCCEEDED:
                return charge  # idempotente
            charge.mark_succeeded(
                external_reference=external_reference or charge.external_reference,
                response=raw if isinstance(raw, dict) else {"raw": str(raw)},
            )

            invoice = SubscriptionInvoice.all_objects.select_for_update().get(pk=charge.invoice_id)
            if invoice.status != SubscriptionInvoice.Status.PAID:
                invoice.mark_paid()

            subscription = TenantSubscription.all_objects.select_for_update().get(pk=invoice.subscription_id)
            cls._activate_for_invoice(subscription, invoice)
        return charge

    @classmethod
    def _activate_for_invoice(cls, subscription, invoice):
        """Alinha a assinatura ao período pago e reativa o tenant se preciso."""
        subscription.current_period_start = invoice.period_start
        subscription.current_period_end = invoice.period_end
        subscription.next_billing_at = invoice.period_end
        subscription.status = TenantSubscription.Status.ACTIVE
        subscription.failed_charges = 0
        if not subscription.start_date:
            subscription.start_date = invoice.period_start
        subscription.save(update_fields=[
            "current_period_start", "current_period_end",
            "next_billing_at", "status", "failed_charges", "start_date",
        ])

        tenant = subscription.tenant
        needs_reactivation = (
            tenant.commercial_status != Tenant.CommercialStatus.ACTIVE or tenant.blocked_at is not None
        )
        if needs_reactivation:
            tenant.commercial_status = Tenant.CommercialStatus.ACTIVE
            tenant.blocked_at = None
            tenant.active = True
            tenant.save(update_fields=["commercial_status", "blocked_at", "active"])

    @classmethod
    def _on_charge_failed(cls, charge):
        """Aplica dunning à assinatura após uma cobrança falhada."""
        subscription = TenantSubscription.all_objects.filter(pk=charge.invoice.subscription_id).first()
        if subscription is None:
            return
        cls._apply_dunning(subscription)

    @classmethod
    def _apply_dunning(cls, subscription):
        max_failures = int(getattr(settings, "SUBSCRIPTION_MAX_FAILED_CHARGES", 3) or 3)
        subscription.failed_charges = (subscription.failed_charges or 0) + 1
        if subscription.failed_charges >= max_failures:
            subscription.status = TenantSubscription.Status.SUSPENDED
            subscription.save(update_fields=["failed_charges", "status"])
            cls._suspend_tenant(subscription.tenant)
        else:
            subscription.status = TenantSubscription.Status.PAST_DUE
            subscription.save(update_fields=["failed_charges", "status"])

    @classmethod
    def _suspend_tenant(cls, tenant):
        tenant.commercial_status = Tenant.CommercialStatus.SUSPENDED
        tenant.blocked_at = tenant.blocked_at or timezone.now()
        tenant.save(update_fields=["commercial_status", "blocked_at"])

    # ------------------------------------------------------------------
    # Webhook / reconciliação
    # ------------------------------------------------------------------
    @classmethod
    def apply_webhook(cls, payload: dict) -> SubscriptionCharge | None:
        """Processa um callback de gateway de forma idempotente."""
        data = (payload or {}).get("data") or payload or {}
        external_reference = (
            data.get("transaction_id") or data.get("external_reference") or data.get("reference")
        )
        status = classify_status(data.get("status"))

        charge = None
        if external_reference:
            charge = (
                SubscriptionCharge.all_objects
                .filter(external_reference=external_reference)
                .order_by("-created_at")
                .first()
            )
        if charge is None and data.get("idempotency_key"):
            charge = SubscriptionCharge.all_objects.filter(idempotency_key=data["idempotency_key"]).first()
        if charge is None:
            return None

        cls._settle_from_status(charge, status, payload, external_reference=external_reference)
        return charge

    @classmethod
    def _settle_from_status(cls, charge, status, raw, *, external_reference=None):
        if charge.is_terminal:
            return charge  # já liquidada → idempotente
        if status == "succeeded":
            return cls._settle_succeeded(charge, external_reference or charge.external_reference, raw)
        if status == "failed":
            charge.mark_failed(response=raw if isinstance(raw, dict) else {"raw": str(raw)})
            cls._on_charge_failed(charge)
        return charge

    @classmethod
    def reconcile(cls, charge=None) -> int:
        """Reconcilia cobranças pendentes consultando o estado no gateway."""
        if charge is not None:
            charges = [charge]
        else:
            charges = list(SubscriptionCharge.all_objects.filter(status=SubscriptionCharge.Status.PENDING))

        settled = 0
        for current in charges:
            if not current.external_reference:
                continue
            try:
                result = get_gateway(current.gateway).status(current.external_reference)
            except Exception:  # noqa: BLE001
                continue
            status = classify_status(result.get("status") if isinstance(result, dict) else result)
            if status != "pending":
                cls._settle_from_status(current, status, result, external_reference=current.external_reference)
                settled += 1
        return settled

    # ------------------------------------------------------------------
    # Ciclo recorrente (chamado pelo Celery beat)
    # ------------------------------------------------------------------
    @classmethod
    def run_billing_cycle(cls, today=None) -> dict:
        today = today or timezone.localdate()
        stats = {"charged": 0, "failed": 0, "suspended": 0, "free_rolled": 0, "pending": 0}

        due = (
            TenantSubscription.objects
            .filter(status__in=list(TenantSubscription.BILLABLE_STATUSES), next_billing_at__lte=today)
            .select_related("plan", "tenant")
        )

        for subscription in due:
            # Planos gratuitos: avança o período sem cobrar.
            if subscription.price() <= Decimal("0.00"):
                start, end = subscription.next_period_bounds()
                subscription.current_period_start = start
                subscription.current_period_end = end
                subscription.next_billing_at = end
                subscription.status = TenantSubscription.Status.ACTIVE
                subscription.save(update_fields=[
                    "current_period_start", "current_period_end", "next_billing_at", "status",
                ])
                stats["free_rolled"] += 1
                continue

            start, end = subscription.next_period_bounds()
            invoice = cls.open_invoice(subscription, period_start=start, period_end=end)
            charge = cls.charge_invoice(invoice)

            if charge is None:
                continue
            if charge.status == SubscriptionCharge.Status.SUCCEEDED:
                stats["charged"] += 1
            elif charge.status == SubscriptionCharge.Status.PENDING:
                stats["pending"] += 1
            else:
                # Dunning já aplicado em _on_charge_failed; reflete no resumo.
                subscription.refresh_from_db(fields=["status"])
                if subscription.status == TenantSubscription.Status.SUSPENDED:
                    stats["suspended"] += 1
                else:
                    stats["failed"] += 1

        return stats
