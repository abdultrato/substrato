from .invoice import Invoice
from .invoice_history import InvoiceHistory
from .invoice_items import InvoiceItem

Fatura = Invoice
HistoricoFatura = InvoiceHistory
FaturaItem = InvoiceItem

__all__ = [
    "Fatura",
    "FaturaItem",
    "HistoricoFatura",
    "Invoice",
    "InvoiceHistory",
    "InvoiceItem",
]
