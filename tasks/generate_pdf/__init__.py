"""Interface pública do pacote `tasks.generate_pdf`.

Este módulo centraliza as funções e views de geração de PDF usadas pelo
frontend e por endpoints internos. Também mantém aliases legados para evitar
quebras em imports antigos.
"""

from .activity_reports_pdf_generator import generate_activity_report_pdf
from .billing_invoice_user_history_pdf_generator import generate_billing_user_history_pdf
from .class_views import RequestPdfView, ResultPdfView
from .invoice_pdf_generator import generate_invoice_pdf
from .model_activity_pdf_generator import generate_model_activity_pdf
from .patient_history_pdf_generator import generate_patient_history_pdf
from .patient_invoice_history_pdf_generator import generate_patient_invoice_history_pdf
from .patient_payment_history_pdf_generator import generate_patient_payment_history_pdf
from .pdf_admin_mixin import PDFAdminMixin, SimplePDFAdminMixin, pdf_action_content, pdf_action_link
from .proforma_pdf_generator import generate_proforma_pdf
from .pdf_base import (
    NumberedCanvas,
    _safe_image_reader,
    append_fim,
    bold,
    cell_paragraph,
    draw_header,
    draw_signatures,
    generate_qr_code,
    on_page,
)
from .pdf_improvements import (
    A5Margins,
    DocumentType,
    build_personalized_header,
    draw_header_improved,
    title_style_improved,
)
from .pdf_registry import PDF_GENERATORS_REGISTRY, register_pdf_generator
from .pharmacy_reports_pdf_generator import (
    generate_pharmacy_least_requested_products_pdf,
    generate_pharmacy_movements_pdf,
    generate_pharmacy_product_consumption_pdf,
    generate_pharmacy_product_sector_demand_pdf,
    generate_pharmacy_sector_movements_pdf,
    generate_pharmacy_stock_pdf,
    generate_pharmacy_top_requested_products_pdf,
)
from .request_pdf_generator import generate_request_pdf
from .result_pdf_generator import generate_results_pdf
from .strings import capitalize_name, digits_only, normalizar_texto, slugify_simples
from .validators import apenas_numeros, validate_code, validate_minimum_text, validate_percentage
from .views import (
    invoice_pdf,
    request_invoice_pdf,
    request_pdf,
    results_pdf,
)

__all__ = [
    "PDF_GENERATORS_REGISTRY",
    "A5Margins",
    "DocumentType",
    "NumberedCanvas",
    "PDFAdminMixin",
    "RequestPdfView",
    "ResultPdfView",
    "SimplePDFAdminMixin",
    "_safe_image_reader",
    "apenas_numeros",
    "append_fim",
    "bold",
    "build_personalized_header",
    "capitalize_name",
    "cell_paragraph",
    "digits_only",
    "draw_header",
    "draw_header_improved",
    "draw_signatures",
    "generate_activity_report_pdf",
    "generate_billing_user_history_pdf",
    "generate_invoice_pdf",
    "generate_model_activity_pdf",
    "generate_proforma_pdf",
    "generate_patient_history_pdf",
    "generate_patient_invoice_history_pdf",
    "generate_patient_payment_history_pdf",
    "generate_pharmacy_least_requested_products_pdf",
    "generate_pharmacy_movements_pdf",
    "generate_pharmacy_product_consumption_pdf",
    "generate_pharmacy_product_sector_demand_pdf",
    "generate_pharmacy_sector_movements_pdf",
    "generate_pharmacy_stock_pdf",
    "generate_pharmacy_top_requested_products_pdf",
    "generate_qr_code",
    "generate_request_pdf",
    "generate_results_pdf",
    "invoice_pdf",
    "normalizar_texto",
    "on_page",
    "pdf_action_content",
    "pdf_action_link",
    "register_pdf_generator",
    "request_invoice_pdf",
    "request_pdf",
    "results_pdf",
    "slugify_simples",
    "title_style_improved",
    "validate_code",
    "validate_minimum_text",
    "validate_percentage",
]

RequisicaoPdf = RequestPdfView
ResultadoPdf = ResultPdfView
capitalizar_name = capitalize_name
invoice_pdf = invoice_pdf
invoice_request_pdf = request_invoice_pdf
gerar_pdf_invoice = generate_invoice_pdf
gerar_pdf_proforma = generate_proforma_pdf
gerar_pdf_historico_faturamento = generate_billing_user_history_pdf
gerar_pdf_atividades = generate_activity_report_pdf
gerar_pdf_modelo_operacional = generate_model_activity_pdf
gerar_pdf_historia_clinica = generate_patient_history_pdf
gerar_pdf_historia_faturas = generate_patient_invoice_history_pdf
gerar_pdf_historia_pagamentos = generate_patient_payment_history_pdf
gerar_pdf_historico_movimentos_farmacia = generate_pharmacy_movements_pdf
gerar_pdf_movimentos_setor_farmacia = generate_pharmacy_sector_movements_pdf
gerar_pdf_estoque_farmacia = generate_pharmacy_stock_pdf
gerar_pdf_consumo_produtos_farmacia = generate_pharmacy_product_consumption_pdf
gerar_pdf_produtos_mais_requisitados_farmacia = generate_pharmacy_top_requested_products_pdf
gerar_pdf_produtos_menos_requisitados_farmacia = generate_pharmacy_least_requested_products_pdf
gerar_pdf_setores_por_produto_farmacia = generate_pharmacy_product_sector_demand_pdf
gerar_pdf_request = generate_request_pdf
gerar_pdf_resultados = generate_results_pdf
gerar_qr_code = generate_qr_code
pdf_request = request_pdf
pdf_resultados = results_pdf
somente_numeros = digits_only
validar_code = validate_code
validar_percentual = validate_percentage
validar_texto_minimo = validate_minimum_text
