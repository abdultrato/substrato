from decimal import Decimal

from django.db import transaction

from apps.billing.models.invoice import Invoice
from apps.billing.models.invoice_items import InvoiceItem
from domain.billing.pricing import calcular_preco_item as calculate_item_price
from services.base import BaseService


class InvoiceService(BaseService):
    """
    Application service for invoice operations.
    """

    @classmethod
    @transaction.atomic
    def create(cls, patient):
        invoice = Invoice.objects.create(
            inquilino=getattr(patient, "inquilino", None),
            paciente=patient,
            estado=Invoice.Estado.RASCUNHO,
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
        if invoice.estado != Invoice.Estado.RASCUNHO:
            return cls.fail("Issued invoices cannot be changed.")

        line_total = calculate_item_price(
            preco_base=unit_price,
            quantidade=quantity,
            desconto_percentual=discount_percent,
            acrescimo_percentual=surcharge_percent,
        )
        calculated_unit_price = (
            (line_total / quantity).quantize(Decimal("0.01")) if quantity else Decimal("0.00")
        )

        InvoiceItem.objects.create(
            inquilino=invoice.inquilino,
            fatura=invoice,
            tipo_item=InvoiceItem.ItemType.AJUSTE,
            descricao=description,
            quantidade=quantity,
            preco_unitario=calculated_unit_price,
            aplica_iva=not exempt_vat,
        )

        cls._refresh_totals(invoice)
        return cls.ok(invoice)

    @classmethod
    @transaction.atomic
    def issue(cls, invoice: Invoice):
        if invoice.estado != Invoice.Estado.RASCUNHO:
            return cls.fail("Only draft invoices can be issued.")

        cls._refresh_totals(invoice)
        invoice.issue()
        return cls.ok(invoice)

    @classmethod
    @transaction.atomic
    def register_payment(cls, invoice: Invoice):
        if invoice.estado != Invoice.Estado.EMITIDA:
            return cls.fail("Invoice must be issued before registering payment.")

        invoice.estado = Invoice.Estado.PAGA
        invoice.save(update_fields=["estado"])
        return cls.ok(invoice)

    @classmethod
    @transaction.atomic
    def cancel(cls, invoice: Invoice):
        invoice.estado = Invoice.Estado.CANCELADA
        invoice.save(update_fields=["estado"])
        return cls.ok(invoice)

    @staticmethod
    def _refresh_totals(invoice: Invoice):
        invoice.persistir_totais()


FaturaService = InvoiceService
InvoiceService.criar = InvoiceService.create
InvoiceService.adicionar_item = InvoiceService.add_item
InvoiceService.emitir = InvoiceService.issue
InvoiceService.registrar_pagamento = InvoiceService.register_payment
InvoiceService.anular = InvoiceService.cancel
InvoiceService._recalcular_totais = InvoiceService._refresh_totals
