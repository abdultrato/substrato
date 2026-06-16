"""Serviço de domínio do fluxo comercial (Cotação e Proforma).

Concentra cálculo financeiro, numeração sequencial, máquina de estados e a
cadeia de conversão Cotação → Proforma → Fatura. Espelha o padrão
``*WorkflowService`` usado noutros módulos (ex.: ``apps.dental.services``).
"""

from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.cotacoes.models import (
    ProformaHistory,
    ProformaInvoice,
    ProformaItem,
    Quotation,
    QuotationItem,
    QuotationStatusHistory,
)

ZERO = Decimal("0.00")

# Máquina de estados comum a Cotação e Proforma (chaveada pelos valores de status,
# que são idênticos nos dois enums). Qualquer transição fora daqui é bloqueada.
_COMMERCIAL_TRANSITIONS: dict[str, frozenset[str]] = {
    "DRAFT": frozenset({"SENT", "CANCELLED"}),
    "SENT": frozenset({"ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"}),
    "ACCEPTED": frozenset({"CONVERTED", "CANCELLED"}),
    "REJECTED": frozenset(),
    "EXPIRED": frozenset(),
    "CONVERTED": frozenset(),
    "CANCELLED": frozenset(),
}
# Alias retrocompatível.
ALLOWED_TRANSITIONS = _COMMERCIAL_TRANSITIONS


def next_sequence_number(tenant, prefix: str, year: int, model) -> int:
    """Próximo número sequencial (1-based) para `{prefix}{year}-` no tenant.

    Trava as linhas existentes (``select_for_update``) para evitar colisões;
    nunca reutiliza números de documentos apagados/cancelados.
    """
    field = "quotation_number" if model is Quotation else "proforma_number"
    token = f"{prefix}-{year}-"
    existing = (
        model.all_objects.select_for_update()
        .filter(tenant=tenant, **{f"{field}__startswith": token})
        .values_list(field, flat=True)
    )
    max_seq = 0
    for number in existing:
        try:
            max_seq = max(max_seq, int(number.rsplit("-", 1)[1]))
        except (IndexError, ValueError):
            continue
    return max_seq + 1


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
        seq = next_sequence_number(quotation.tenant, "COT", year, Quotation)
        quotation.quotation_number = f"COT-{year}-{seq:06d}"
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

    # ── Conversão para proforma (Cotação → Proforma) ────────────────────
    @staticmethod
    @transaction.atomic
    def convert_to_proforma(quotation: Quotation, *, actor_name: str = "") -> ProformaInvoice:
        if quotation.status != Quotation.Status.ACCEPTED:
            raise ValidationError("Só é possível converter cotações aceites.")
        if quotation.converted_proforma_id:
            raise ValidationError("Esta cotação já foi convertida em proforma.")

        proforma = ProformaInvoice(
            tenant=quotation.tenant,
            quotation=quotation,
            status=ProformaInvoice.Status.DRAFT,
            patient=quotation.patient,
            fiscal_client=quotation.fiscal_client,
            fiscal_client_name=quotation.fiscal_client_name,
            fiscal_client_nuit=quotation.fiscal_client_nuit,
            fiscal_client_address=quotation.fiscal_client_address,
            currency=quotation.currency,
            exchange_rate=quotation.exchange_rate,
            deposit_type=quotation.deposit_type,
            deposit_percentage=quotation.deposit_percentage,
            deposit_fixed_amount=quotation.deposit_fixed_amount,
            notes=quotation.notes,
            terms_and_conditions=quotation.terms_and_conditions,
        )
        proforma.save()
        for item in quotation.items.all():
            ProformaItem.objects.create(
                proforma=proforma,
                tenant=proforma.tenant,
                item_type=item.item_type,
                description=item.description,
                quantity=item.quantity,
                unit_price=item.unit_price,
                discount_rate=item.discount_rate,
                tax_rate=item.tax_rate,
            )
        ProformaWorkflowService.recalculate_totals(proforma)
        ProformaWorkflowService._record(
            proforma,
            event_type="created_from_quotation",
            to_status=proforma.status,
            actor_name=actor_name,
            summary=f"Criada da cotação {quotation.quotation_number or quotation.custom_id}.",
            metadata={"quotation_id": quotation.pk},
        )

        quotation.converted_proforma = proforma
        quotation.converted_at = timezone.now()
        quotation.save(update_fields=["converted_proforma", "converted_at"])
        QuotationWorkflowService.transition(
            quotation,
            Quotation.Status.CONVERTED,
            event_type="converted_to_proforma",
            actor_name=actor_name,
            summary="Cotação convertida em proforma.",
            metadata={"proforma_id": proforma.pk},
        )
        return proforma

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


class ProformaWorkflowService:
    """Operações de ciclo de vida da proforma e conversão para fatura."""

    # ── Criação / edição ────────────────────────────────────────────────
    @staticmethod
    @transaction.atomic
    def create_proforma(*, tenant, items=None, **fields) -> ProformaInvoice:
        proforma = ProformaInvoice(tenant=tenant, **fields)
        proforma.full_clean(exclude=["proforma_number"])
        proforma.save()
        for item in items or []:
            ProformaWorkflowService.add_item(proforma, **item)
        ProformaWorkflowService.recalculate_totals(proforma)
        ProformaWorkflowService._record(
            proforma, event_type="created", to_status=proforma.status, summary="Proforma criada."
        )
        return proforma

    @staticmethod
    def _assert_editable(proforma: ProformaInvoice) -> None:
        if proforma.is_locked:
            raise ValidationError(
                f"Proforma em estado '{proforma.get_status_display()}' não permite alterar valores."
            )

    @staticmethod
    @transaction.atomic
    def add_item(proforma: ProformaInvoice, **fields) -> ProformaItem:
        ProformaWorkflowService._assert_editable(proforma)
        item = ProformaItem(proforma=proforma, tenant=proforma.tenant, **fields)
        item.full_clean()
        item.save()
        ProformaWorkflowService.recalculate_totals(proforma)
        return item

    @staticmethod
    @transaction.atomic
    def update_item(item: ProformaItem, **fields) -> ProformaItem:
        ProformaWorkflowService._assert_editable(item.proforma)
        for key, value in fields.items():
            setattr(item, key, value)
        item.full_clean()
        item.save()
        ProformaWorkflowService.recalculate_totals(item.proforma)
        return item

    @staticmethod
    @transaction.atomic
    def remove_item(item: ProformaItem) -> None:
        proforma = item.proforma
        ProformaWorkflowService._assert_editable(proforma)
        item.delete()
        ProformaWorkflowService.recalculate_totals(proforma)

    # ── Cálculo financeiro ──────────────────────────────────────────────
    @staticmethod
    @transaction.atomic
    def recalculate_totals(proforma: ProformaInvoice) -> ProformaInvoice:
        subtotal = ZERO
        discount_total = ZERO
        tax_total = ZERO
        for item in proforma.items.all():
            subtotal += item.gross
            discount_total += item.discount_amount or ZERO
            tax_total += item.tax_amount or ZERO
        proforma.subtotal = subtotal.quantize(Decimal("0.01"))
        proforma.discount_total = discount_total.quantize(Decimal("0.01"))
        proforma.tax_total = tax_total.quantize(Decimal("0.01"))
        grand = subtotal - discount_total + tax_total
        proforma.grand_total = (grand if grand > ZERO else ZERO).quantize(Decimal("0.01"))
        ProformaWorkflowService._apply_deposit(proforma)
        proforma.save()
        return proforma

    @staticmethod
    def _apply_deposit(proforma: ProformaInvoice) -> None:
        total = proforma.grand_total or ZERO
        if proforma.deposit_type == ProformaInvoice.DepositType.PERCENTAGE:
            required = (total * (proforma.deposit_percentage or ZERO) / Decimal("100")).quantize(Decimal("0.01"))
        elif proforma.deposit_type == ProformaInvoice.DepositType.FIXED:
            required = min(proforma.deposit_fixed_amount or ZERO, total)
        else:
            required = ZERO
        proforma.deposit_required = required
        proforma.balance_due = (total - required).quantize(Decimal("0.01"))

    # ── Numeração ───────────────────────────────────────────────────────
    @staticmethod
    @transaction.atomic
    def generate_proforma_number(proforma: ProformaInvoice) -> str:
        if proforma.proforma_number:
            return proforma.proforma_number
        year = (proforma.issue_date or timezone.now().date()).year
        seq = next_sequence_number(proforma.tenant, "PRO", year, ProformaInvoice)
        proforma.proforma_number = f"PRO-{year}-{seq:06d}"
        proforma.save(update_fields=["proforma_number"])
        return proforma.proforma_number

    # ── Máquina de estados ──────────────────────────────────────────────
    @staticmethod
    @transaction.atomic
    def transition(proforma: ProformaInvoice, to_status: str, *, event_type: str, actor_name: str = "", summary: str = "", metadata=None):
        allowed = _COMMERCIAL_TRANSITIONS.get(proforma.status, frozenset())
        if to_status not in allowed:
            raise ValidationError(
                f"Transição inválida: {proforma.get_status_display()} → {to_status}."
            )
        previous = proforma.status
        proforma.status = to_status
        proforma.save(update_fields=["status"])
        ProformaWorkflowService._record(
            proforma,
            event_type=event_type,
            from_status=previous,
            to_status=to_status,
            actor_name=actor_name,
            summary=summary,
            metadata=metadata,
        )
        return proforma

    @staticmethod
    @transaction.atomic
    def send(proforma: ProformaInvoice, *, actor_name: str = "") -> ProformaInvoice:
        if not proforma.items.exists():
            raise ValidationError("Não é possível enviar uma proforma sem itens.")
        ProformaWorkflowService.generate_proforma_number(proforma)
        if not proforma.issue_date:
            proforma.issue_date = timezone.now().date()
            proforma.save(update_fields=["issue_date"])
        proforma = ProformaWorkflowService.transition(
            proforma, ProformaInvoice.Status.SENT, event_type="sent", actor_name=actor_name, summary="Proforma enviada."
        )
        proforma.sent_at = timezone.now()
        proforma.save(update_fields=["sent_at"])
        return proforma

    @staticmethod
    @transaction.atomic
    def accept(proforma: ProformaInvoice, *, actor_name: str = "") -> ProformaInvoice:
        proforma = ProformaWorkflowService.transition(
            proforma, ProformaInvoice.Status.ACCEPTED, event_type="accepted", actor_name=actor_name, summary="Proforma aceite."
        )
        proforma.accepted_at = timezone.now()
        proforma.save(update_fields=["accepted_at"])
        return proforma

    @staticmethod
    @transaction.atomic
    def reject(proforma: ProformaInvoice, *, reason: str = "", actor_name: str = "") -> ProformaInvoice:
        proforma = ProformaWorkflowService.transition(
            proforma,
            ProformaInvoice.Status.REJECTED,
            event_type="rejected",
            actor_name=actor_name,
            summary="Proforma rejeitada.",
            metadata={"reason": reason},
        )
        proforma.rejected_at = timezone.now()
        proforma.rejection_reason = reason or ""
        proforma.save(update_fields=["rejected_at", "rejection_reason"])
        return proforma

    @staticmethod
    @transaction.atomic
    def cancel(proforma: ProformaInvoice, *, actor_name: str = "") -> ProformaInvoice:
        return ProformaWorkflowService.transition(
            proforma,
            ProformaInvoice.Status.CANCELLED,
            event_type="cancelled",
            actor_name=actor_name,
            summary="Proforma cancelada.",
        )

    @staticmethod
    @transaction.atomic
    def expire_overdue(*, tenant=None) -> int:
        today = timezone.now().date()
        qs = ProformaInvoice.objects.filter(status=ProformaInvoice.Status.SENT, expiry_date__lt=today)
        if tenant is not None:
            qs = qs.filter(tenant=tenant)
        count = 0
        for proforma in qs:
            ProformaWorkflowService.transition(
                proforma, ProformaInvoice.Status.EXPIRED, event_type="expired", summary="Proforma expirada automaticamente."
            )
            count += 1
        return count

    # ── Conversão para fatura (Proforma → Invoice emitida) ──────────────
    @staticmethod
    @transaction.atomic
    def convert_to_invoice(proforma: ProformaInvoice, *, actor_name: str = ""):
        from apps.billing.models.invoice import Invoice
        from apps.billing.models.invoice_items import InvoiceItem

        if proforma.status != ProformaInvoice.Status.ACCEPTED:
            raise ValidationError("Só é possível converter proformas aceites.")
        if proforma.converted_invoice_id:
            raise ValidationError("Esta proforma já foi convertida em fatura.")

        invoice = Invoice(
            tenant=proforma.tenant,
            origin=Invoice.Origin.PROFORMA,
            status=Invoice.Status.DRAFT,
            patient=proforma.patient,
            fiscal_client=proforma.fiscal_client,
            fiscal_client_name=proforma.fiscal_client_name,
            fiscal_client_nuit=proforma.fiscal_client_nuit,
            fiscal_client_address=proforma.fiscal_client_address,
            source_proforma=proforma,
            source_quotation=proforma.quotation,
        )
        invoice.save()

        for item in proforma.items.all():
            InvoiceItem.objects.create(
                invoice=invoice,
                tenant=proforma.tenant,
                item_type=InvoiceItem.ItemType.AJUSTE,
                description=item.description or "Item de proforma",
                quantity=item.quantity,
                unit_price=item.unit_price,
                applies_vat=False,
            )

        invoice.issue()

        proforma.converted_invoice = invoice
        proforma.converted_at = timezone.now()
        proforma.save(update_fields=["converted_invoice", "converted_at"])
        ProformaWorkflowService.transition(
            proforma,
            ProformaInvoice.Status.CONVERTED,
            event_type="converted_to_invoice",
            actor_name=actor_name,
            summary="Proforma convertida em fatura.",
            metadata={"invoice_id": invoice.pk},
        )
        return invoice

    # ── Trilha de eventos ───────────────────────────────────────────────
    @staticmethod
    def _record(
        proforma: ProformaInvoice,
        *,
        event_type: str,
        from_status: str = "",
        to_status: str = "",
        actor_name: str = "",
        summary: str = "",
        metadata=None,
    ) -> ProformaHistory:
        return ProformaHistory.objects.create(
            tenant=proforma.tenant,
            proforma=proforma,
            from_status=from_status,
            to_status=to_status,
            event_type=event_type,
            actor_name=actor_name or "",
            summary=summary or "",
            metadata=metadata or {},
            event_at=timezone.now(),
        )
