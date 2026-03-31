from decimal import Decimal

from django.db import transaction

from apps.billing.models.invoice import Invoice
from apps.billing.models.invoice_items import InvoiceItem
from domain.billing.pricing import calculate_item_price
from services.base import BaseService


class InvoiceService(BaseService):
    """
    Serviço de aplicação para operações de invoice.
    """

    @classmethod
    @transaction.atomic
    def create(cls, patient):
        invoice = Invoice.objects.create(
            tenant=getattr(patient, "tenant", None),
            patient=patient,
            status=Invoice.Status.DRAFT,
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
        if invoice.status != Invoice.Status.DRAFT:
            return cls.fail("Issued invoices cannot be changed.")

        line_total = calculate_item_price(
            base_price=unit_price,
            quantity=quantity,
            discount_percent=discount_percent,
            surcharge_percent=surcharge_percent,
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
        if invoice.status != Invoice.Status.DRAFT:
            return cls.fail("Only draft invoices can be issued.")

        cls._refresh_totals(invoice)
        invoice.issue()
        return cls.ok(invoice)

    @classmethod
    @transaction.atomic
    def register_payment(cls, invoice: Invoice):
        if invoice.status != Invoice.Status.ISSUED:
            return cls.fail("Invoice must be issued before registering payment.")

        invoice.status = Invoice.Status.PAID
        invoice.save(update_fields=["status"])
        return cls.ok(invoice)

    @classmethod
    @transaction.atomic
    def cancel(cls, invoice: Invoice):
        invoice.status = Invoice.Status.CANCELED
        invoice.save(update_fields=["status"])
        return cls.ok(invoice)

    @staticmethod
    def _refresh_totals(invoice: Invoice):
        invoice.persist_totals()

"""Criação, atualização e envio de faturas no ciclo de cobrança."""
