from apps.billing.models import InvoiceHistory


def registrar_evento_fatura(fatura, descricao, tipo=None):
    return InvoiceHistory.objects.create(
        fatura=fatura,
        descricao=descricao,
        tipo_evento=tipo,
    )
