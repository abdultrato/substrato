from apps.billing.models import InvoiceHistory


def register_invoice_event(fatura, descricao, tipo=None):
    return InvoiceHistory.objects.create(
        fatura=fatura,
        descricao=descricao,
        tipo_evento=tipo,
    )


registrar_evento_fatura = register_invoice_event
