from apps.billing.models.invoice import Invoice
from apps.billing.models.invoice_items import InvoiceItem
from domain.billing.calculadora_precos import calcular_subtotal as calculate_subtotal


class InvoiceBuilderService:
    @staticmethod
    def create_invoice(patient, tenant=None):
        return Invoice.objects.create(
            inquilino=tenant or getattr(patient, "inquilino", None),
            paciente=patient,
        )

    @staticmethod
    def add_item(invoice, description, quantity, unit_price):
        calculate_subtotal(quantity, unit_price)

        item = InvoiceItem.objects.create(
            inquilino=invoice.inquilino,
            fatura=invoice,
            tipo_item=InvoiceItem.ItemType.AJUSTE,
            descricao=description,
            quantidade=quantity,
            preco_unitario=unit_price,
        )
        invoice.persistir_totais()
        return item

    @staticmethod
    def generate_invoice(lab_request, issue=True):
        existing_invoice = Invoice.objects.filter(requisicao=lab_request).first()
        if existing_invoice:
            return existing_invoice

        invoice = Invoice(
            inquilino=lab_request.inquilino,
            origem=Invoice.Origem.CLINICO,
            requisicao=lab_request,
            paciente=lab_request.paciente,
        )
        invoice.full_clean()
        invoice.save()
        invoice.sincronizar_itens_da_origem()

        if issue:
            invoice.issue()

        return invoice


ServicoFaturamento = InvoiceBuilderService
InvoiceBuilderService.criar_fatura = InvoiceBuilderService.create_invoice
InvoiceBuilderService.adicionar_item = InvoiceBuilderService.add_item
InvoiceBuilderService.gerar_fatura = InvoiceBuilderService.generate_invoice
