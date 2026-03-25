from decimal import Decimal

from django.db import transaction

from apps.billing.models.invoice import Invoice
from apps.billing.models.invoice_items import InvoiceItem
from domain.billing.pricing import calcular_price_item as calculate_item_price
from services.base import BaseService


class InvoiceService(BaseService):
    """
    Application service for invoice operations.
    """

    @classmethod
    @transaction.atomic
    def create(cls, patient):
        invoice = Invoice.objects.create(
            tenant=getattr(patient, "tenant", None),
            patient=patient,
            status=Invoice.Estado.RASCUNHO,
        )
        return cls.ok(invoice)

    @classmethod
    @transaction.atomic
    def add_item(
        cls,
        invoice: Invoice,
        description: str,
        quantity: Decimal,
        unit_price: Decimal,
        discount_percent: Decimal = 0,
        surcharge_percent: Decimal = 0,
        exempt_vat: bool = False,
    ):
        if invoice.status != Invoice.Estado.RASCUNHO:
            return cls.fail("Issued invoices cannot be changed.")

        line_total = calculate_item_price(
            base_price=unit_price,
            quantity=quantity,
            desconto_percentual=discount_percent,
            acrescimo_percentual=surcharge_percent,
        )
        calculated_unit_price = (
            (line_total / quantity).quantize(Decimal("0.01")) if quantity else Decimal("0.00")
        )

        InvoiceItem.objects.create(
            tenant=invoice.tenant,
            invoice=invoice,
            item_type=InvoiceItem.ItemType.AJUSTE,
            description=description,
            quantity=quantity,
            unit_price=calculated_unit_price,
            applies_vat=not exempt_vat,
        )

        cls._refresh_totals(invoice)
        return cls.ok(invoice)

    @classmethod
    @transaction.atomic
    def issue(cls, invoice: Invoice):
        if invoice.status != Invoice.Estado.RASCUNHO:
            return cls.fail("Only draft invoices can be issued.")

        cls._refresh_totals(invoice)
        invoice.issue()
        return cls.ok(invoice)

    @classmethod
    @transaction.atomic
    def register_payment(cls, invoice: Invoice):
        if invoice.status != Invoice.Estado.EMITIDA:
            return cls.fail("Invoice must be issued before registering payment.")

        invoice.status = Invoice.Estado.PAGA
        invoice.save(update_fields=["status"])
        return cls.ok(invoice)

    @classmethod
    @transaction.atomic
    def cancel(cls, invoice: Invoice):
        invoice.status = Invoice.Estado.CANCELADA
        invoice.save(update_fields=["status"])
        return cls.ok(invoice)

    @staticmethod
    def _refresh_totals(invoice: Invoice):
        invoice.persistir_totais()


FaturaService = InvoiceService
InvoiceService.criar = InvoiceService.create
InvoiceService.adicionar_item = InvoiceService.add_item
InvoiceService.emitir = InvoiceService.issue
InvoiceService.registrar_payment = InvoiceService.register_payment
InvoiceService.anular = InvoiceService.cancel
InvoiceService._recalcular_totais = InvoiceService._refresh_totals
