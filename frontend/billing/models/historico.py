"""Alias para histórico financeiro usado por integrações de UI."""

from apps.billing.models.invoice_history import InvoiceHistory

HistoricoFinanceiro = InvoiceHistory

__all__ = ["HistoricoFinanceiro", "InvoiceHistory"]
