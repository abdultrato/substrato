"""Geração do PDF de histórico de faturas por paciente."""

from .patient_history_pdf_generator import generate_patient_history_pdf_by_scope


def generate_patient_invoice_history_pdf(payload: dict, request=None) -> tuple[bytes, str]:
    """Gera PDF contendo apenas histórico financeiro de faturas do paciente."""
    return generate_patient_history_pdf_by_scope(payload, request=request, scope="invoices")


gerar_pdf_historia_faturas = generate_patient_invoice_history_pdf
