"""Serviço de domínio do módulo de Cotação.

Concentra cálculo financeiro, numeração sequencial, máquina de estados e
conversão para fatura. Espelha o padrão ``*WorkflowService`` usado noutros
módulos (ex.: ``apps.dental.services.DentalWorkflowService``).
"""

from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.cotacoes.models import Quotation, QuotationItem, QuotationStatusHistory

ZERO = Decimal("0.00")

# Transições permitidas da cotação (§4). Qualquer outra é bloqueada.
ALLOWED_TRANSITIONS: dict[str, frozenset[str]] = {
    Quotation.Status.DRAFT: frozenset({Quotation.Status.SENT, Quotation.Status.CANCELLED}),
    Quotation.Status.SENT: frozenset(
        {
            Quotation.Status.ACCEPTED,
            Quotation.Status.REJECTED,
            Quotation.Status.EXPIRED,
            Quotation.Status.CANCELLED,
        }
    ),
    Quotation.Status.ACCEPTED: frozenset({Quotation.Status.CONVERTED, Quotation.Status.CANCELLED}),
    Quotation.Status.REJECTED: frozenset(),
    Quotation.Status.EXPIRED: frozenset(),
    Quotation.Status.CONVERTED: frozenset(),
    Quotation.Status.CANCELLED: frozenset(),
}


class QuotationWorkflowService:
    """Operações de ciclo de vida da cotação."""

    # ── Criação / edição ────────────────────────────────────────────────
    @staticmethod
    @transaction.atomic
    def create_quotation(*, tenant, items=None, **fields) -> Quotation:
        quotation = Quotation(tenant=tenant, **fields)
        quotation.full_clean(exclude=["quotation_number"])
        quotation.save()
        for item in items or []:
            QuotationWorkflowService.add_item(quotation, **item)
        QuotationWorkflowService.recalculate_totals(quotation)
        QuotationWorkflowService._record(
            quotation, event_type="created", to_status=quotation.status, summary="Cotação criada."
        )
        return quotation

    @staticmethod
    def _assert_editable(quotation: Quotation) -> None:
        if quotation.is_locked:
            raise ValidationError(
                f"Cotação em estado '{quotation.get_status_display()}' não permite alterar valores."
            )

    @staticmethod
    @transaction.atomic
    def add_item(quotation: Quotation, **fields) -> QuotationItem:
        QuotationWorkflowService._assert_editable(quotation)
        item = QuotationItem(quotation=quotation, tenant=quotation.tenant, **fields)
        item.full_clean()
        item.save()
        QuotationWorkflowService.recalculate_totals(quotation)
        return item

    @staticmethod
    @transaction.atomic
    def update_item(item: QuotationItem, **fields) -> QuotationItem:
        QuotationWorkflowService._assert_editable(item.quotation)
        for key, value in fields.items():
            setattr(item, key, value)
        item.full_clean()
        item.save()
        QuotationWorkflowService.recalculate_totals(item.quotation)
        return item

    @staticmethod
    @transaction.atomic
    def remove_item(item: QuotationItem) -> None:
        quotation = item.quotation
        QuotationWorkflowService._assert_editable(quotation)
        item.delete()
        QuotationWorkflowService.recalculate_totals(quotation)

    # ── Cálculo financeiro (§11) ────────────────────────────────────────
    @staticmethod
    @transaction.atomic
    def recalculate_totals(quotation: Quotation) -> Quotation:
        # Recalcula a partir das parcelas para manter coerência por linha.
        subtotal = ZERO
        discount_total = ZERO
        tax_total = ZERO
        for item in quotation.items.all():
            subtotal += item.gross
            discount_total += item.discount_amount or ZERO
            tax_total += item.tax_amount or ZERO
        quotation.subtotal = subtotal.quantize(Decimal("0.01"))
        quotation.discount_total = discount_total.quantize(Decimal("0.01"))
        quotation.tax_total = tax_total.quantize(Decimal("0.01"))
        grand = subtotal - discount_total + tax_total
        quotation.grand_total = (grand if grand > ZERO else ZERO).quantize(Decimal("0.01"))
        QuotationWorkflowService._apply_deposit(quotation)
        quotation.save()
        return quotation

    @staticmethod
    def _apply_deposit(quotation: Quotation) -> None:
        total = quotation.grand_total or ZERO
        if quotation.deposit_type == Quotation.DepositType.PERCENTAGE:
            required = (total * (quotation.deposit_percentage or ZERO) / Decimal("100")).quantize(Decimal("0.01"))
        elif quotation.deposit_type == Quotation.DepositType.FIXED:
            required = min(quotation.deposit_fixed_amount or ZERO, total)
        else:
            required = ZERO
        quotation.deposit_required = required
        quotation.balance_due = (total - required).quantize(Decimal("0.01"))

    # ── Numeração (§8) ──────────────────────────────────────────────────
    @staticmethod
    @transaction.atomic
    def generate_quotation_number(quotation: Quotation) -> str:
        if quotation.quotation_number:
            return quotation.quotation_number
        year = (quotation.issue_date or timezone.now().date()).year
        prefix = f"COT-{year}-"
        # Trava as linhas do tenant/ano para evitar colisão de sequência.
        existing = (
            Quotation.all_objects.select_for_update()
            .filter(tenant=quotation.tenant, quotation_number__startswith=prefix)
            .values_list("quotation_number", flat=True)
        )
        max_seq = 0
        for number in existing:
            try:
                max_seq = max(max_seq, int(number.rsplit("-", 1)[1]))
            except (IndexError, ValueError):
                continue
        quotation.quotation_number = f"{prefix}{max_seq + 1:06d}"
        quotation.save(update_fields=["quotation_number"])
        return quotation.quotation_number

    # ── Máquina de estados (§4) ─────────────────────────────────────────
    @staticmethod
    @transaction.atomic
    def transition(quotation: Quotation, to_status: str, *, event_type: str, actor_name: str = "", summary: str = "", metadata=None):
        allowed = ALLOWED_TRANSITIONS.get(quotation.status, frozenset())
        if to_status not in allowed:
            raise ValidationError(
                f"Transição inválida: {quotation.get_status_display()} → {to_status}."
            )
        previous = quotation.status
        quotation.status = to_status
        quotation.save(update_fields=["status"])
        QuotationWorkflowService._record(
            quotation,
            event_type=event_type,
            from_status=previous,
            to_status=to_status,
            actor_name=actor_name,
            summary=summary,
            metadata=metadata,
        )
        return quotation

    @staticmethod
    @transaction.atomic
    def send(quotation: Quotation, *, actor_name: str = "") -> Quotation:
        if not quotation.items.exists():
            raise ValidationError("Não é possível enviar uma cotação sem itens.")
        QuotationWorkflowService.generate_quotation_number(quotation)
        if not quotation.issue_date:
            quotation.issue_date = timezone.now().date()
            quotation.save(update_fields=["issue_date"])
        quotation = QuotationWorkflowService.transition(
            quotation, Quotation.Status.SENT, event_type="sent", actor_name=actor_name, summary="Cotação enviada."
        )
        quotation.sent_at = timezone.now()
        quotation.save(update_fields=["sent_at"])
        return quotation

    @staticmethod
    @transaction.atomic
    def accept(quotation: Quotation, *, actor_name: str = "") -> Quotation:
        quotation = QuotationWorkflowService.transition(
            quotation, Quotation.Status.ACCEPTED, event_type="accepted", actor_name=actor_name, summary="Cotação aceite."
        )
        quotation.accepted_at = timezone.now()
        quotation.save(update_fields=["accepted_at"])
        return quotation

    @staticmethod
    @transaction.atomic
    def reject(quotation: Quotation, *, reason: str = "", actor_name: str = "") -> Quotation:
        quotation = QuotationWorkflowService.transition(
            quotation,
            Quotation.Status.REJECTED,
            event_type="rejected",
            actor_name=actor_name,
            summary="Cotação rejeitada.",
            metadata={"reason": reason},
        )
        quotation.rejected_at = timezone.now()
        quotation.rejection_reason = reason or ""
        quotation.save(update_fields=["rejected_at", "rejection_reason"])
        return quotation

    @staticmethod
    @transaction.atomic
    def cancel(quotation: Quotation, *, actor_name: str = "") -> Quotation:
        return QuotationWorkflowService.transition(
            quotation,
            Quotation.Status.CANCELLED,
            event_type="cancelled",
            actor_name=actor_name,
            summary="Cotação cancelada.",
        )

    @staticmethod
    @transaction.atomic
    def expire_overdue(*, tenant=None) -> int:
        """Expira cotações enviadas cuja validade já passou (§21). Retorna a contagem."""
        today = timezone.now().date()
        qs = Quotation.objects.filter(status=Quotation.Status.SENT, expiry_date__lt=today)
        if tenant is not None:
            qs = qs.filter(tenant=tenant)
        count = 0
        for quotation in qs:
            QuotationWorkflowService.transition(
                quotation, Quotation.Status.EXPIRED, event_type="expired", summary="Cotação expirada automaticamente."
            )
            count += 1
        return count

    # ── Duplicar (§10) ──────────────────────────────────────────────────
    @staticmethod
    @transaction.atomic
    def duplicate(quotation: Quotation, *, actor_name: str = "") -> Quotation:
        copy = Quotation(
            tenant=quotation.tenant,
            fiscal_client=quotation.fiscal_client,
            fiscal_client_name=quotation.fiscal_client_name,
            fiscal_client_nuit=quotation.fiscal_client_nuit,
            fiscal_client_address=quotation.fiscal_client_address,
            patient=quotation.patient,
            currency=quotation.currency,
            exchange_rate=quotation.exchange_rate,
            deposit_type=quotation.deposit_type,
            deposit_percentage=quotation.deposit_percentage,
            deposit_fixed_amount=quotation.deposit_fixed_amount,
            notes=quotation.notes,
            terms_and_conditions=quotation.terms_and_conditions,
            status=Quotation.Status.DRAFT,
        )
        copy.save()
        for item in quotation.items.all():
            QuotationItem.objects.create(
                quotation=copy,
                tenant=copy.tenant,
                item_type=item.item_type,
                description=item.description,
                quantity=item.quantity,
                unit_price=item.unit_price,
                discount_rate=item.discount_rate,
                tax_rate=item.tax_rate,
            )
        QuotationWorkflowService.recalculate_totals(copy)
        QuotationWorkflowService._record(
            copy,
            event_type="duplicated",
            to_status=copy.status,
            actor_name=actor_name,
            summary=f"Duplicada de {quotation.quotation_number or quotation.custom_id}.",
            metadata={"source_id": quotation.pk},
        )
        return copy

    # ── Conversão para fatura (§22) ─────────────────────────────────────
    @staticmethod
    @transaction.atomic
    def convert_to_invoice(quotation: Quotation, *, actor_name: str = ""):
        from apps.billing.models.invoice import Invoice
        from apps.billing.models.invoice_items import InvoiceItem

        if quotation.status != Quotation.Status.ACCEPTED:
            raise ValidationError("Só é possível converter cotações aceites.")
        if quotation.converted_invoice_id:
            raise ValidationError("Esta cotação já foi convertida.")

        invoice = Invoice(
            tenant=quotation.tenant,
            origin=Invoice.Origin.MIXED,
            status=Invoice.Status.DRAFT,
            patient=quotation.patient,
            fiscal_client=quotation.fiscal_client,
            fiscal_client_name=quotation.fiscal_client_name,
            fiscal_client_nuit=quotation.fiscal_client_nuit,
            fiscal_client_address=quotation.fiscal_client_address,
        )
        invoice.save()

        for item in quotation.items.all():
            InvoiceItem.objects.create(
                invoice=invoice,
                tenant=quotation.tenant,
                item_type=InvoiceItem.ItemType.AJUSTE,
                description=item.description or "Item de cotação",
                quantity=item.quantity,
                unit_price=item.unit_price,
                applies_vat=False,
            )

        quotation.converted_invoice = invoice
        quotation.converted_at = timezone.now()
        quotation.save(update_fields=["converted_invoice", "converted_at"])
        QuotationWorkflowService.transition(
            quotation,
            Quotation.Status.CONVERTED,
            event_type="converted",
            actor_name=actor_name,
            summary="Cotação convertida em fatura.",
            metadata={"invoice_id": invoice.pk},
        )
        return invoice

    # ── Trilha de eventos ───────────────────────────────────────────────
    @staticmethod
    def _record(
        quotation: Quotation,
        *,
        event_type: str,
        from_status: str = "",
        to_status: str = "",
        actor_name: str = "",
        summary: str = "",
        metadata=None,
    ) -> QuotationStatusHistory:
        return QuotationStatusHistory.objects.create(
            tenant=quotation.tenant,
            quotation=quotation,
            from_status=from_status,
            to_status=to_status,
            event_type=event_type,
            actor_name=actor_name or "",
            summary=summary or "",
            metadata=metadata or {},
            event_at=timezone.now(),
        )
