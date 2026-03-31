from apps.billing.models.invoice import Invoice
from apps.billing.models.invoice_items import InvoiceItem
from domain.billing.price_calculator import calculate_subtotal


class InvoiceBuilderService:
    @staticmethod
    def create_invoice(patient, tenant=None):
        return Invoice.objects.create(
            tenant=tenant or getattr(patient, "tenant", None),
            patient=patient,
        )

    @staticmethod
    def add_item(invoice, description, quantity, unit_price):
        calculate_subtotal(quantity, unit_price)

        item = InvoiceItem.objects.create(
            tenant=invoice.tenant,
            invoice=invoice,
            item_type=InvoiceItem.ItemType.AJUSTE,
            description=description,
            quantity=quantity,
            unit_price=unit_price,
        )
        invoice.persist_totals()
        return item

    @staticmethod
    def generate_invoice(lab_request, issue=True):
        existing_invoice = Invoice.objects.filter(request=lab_request).first()
        if existing_invoice:
            return existing_invoice

        invoice = Invoice(
            tenant=lab_request.tenant,
            origin=Invoice.Origin.CLINICAL,
            request=lab_request,
            patient=lab_request.patient,
        )
        invoice.full_clean()
        invoice.save()
        invoice.sync_items_from_origin()

        if issue:
            invoice.issue()

        return invoice

"""Opera criação/atualização de faturas e integrações de cobrança."""
