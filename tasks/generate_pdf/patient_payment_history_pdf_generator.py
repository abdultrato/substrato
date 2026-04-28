"""Geração do PDF de histórico de pagamentos por paciente."""

from .patient_history_pdf_generator import generate_patient_history_pdf_by_scope


def generate_patient_payment_history_pdf(payload: dict, request=None) -> tuple[bytes, str]:
    """Gera PDF contendo histórico de pagamentos e recibos do paciente."""
    return generate_patient_history_pdf_by_scope(payload, request=request, scope="payments")


gerar_pdf_historia_pagamentos = generate_patient_payment_history_pdf

