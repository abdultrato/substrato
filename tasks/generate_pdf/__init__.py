from .class_views import RequestPdfView, ResultPdfView
from .invoice_pdf_generator import generate_invoice_pdf
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
    "NumberedCanvas",
    "RequestPdfView",
    "ResultPdfView",
    "_safe_image_reader",
    "apenas_numeros",
    "append_fim",
    "bold",
    "capitalize_name",
    "cell_paragraph",
    "digits_only",
    "draw_header",
    "draw_signatures",
    "generate_invoice_pdf",
    "generate_qr_code",
    "generate_request_pdf",
    "generate_results_pdf",
    "invoice_pdf",
    "normalizar_texto",
    "on_page",
    "request_invoice_pdf",
    "request_pdf",
    "results_pdf",
    "slugify_simples",
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
gerar_pdf_request = generate_request_pdf
gerar_pdf_resultados = generate_results_pdf
gerar_qr_code = generate_qr_code
pdf_request = request_pdf
pdf_resultados = results_pdf
somente_numeros = digits_only
validar_code = validate_code
validar_percentual = validate_percentage
validar_texto_minimo = validate_minimum_text
