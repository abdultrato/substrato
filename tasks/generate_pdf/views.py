"""Views HTTP para geração de PDFs clínicos e financeiros."""

import logging

from django.contrib.admin.views.decorators import staff_member_required
from django.http import Http404, HttpResponse
from django.shortcuts import get_object_or_404

from apps.billing.models.invoice import Invoice
from apps.clinical.models.lab_request import LabRequest

from .invoice_pdf_generator import generate_invoice_pdf
from .request_pdf_generator import generate_request_pdf
from .result_pdf_generator import generate_results_pdf

logger = logging.getLogger("pdf.views")


@staff_member_required
def result_pdf(request, custom_id):
    """
    Gera o PDF institucional de resultados laboratoriais.
    """

    try:
        request = get_object_or_404(
            LabRequest.objects.select_related(
                "patient",
                "analyst",
            ).prefetch_related(
                "result__itens__exam_field__test",
            ),
            custom_id=custom_id,
        )

        pdf_bytes, filename = generate_results_pdf(
            request,
            apenas_validados=True,
        )

        response = HttpResponse(
            pdf_bytes,
            content_type="application/pdf",
        )

        response["Content-Disposition"] = f'inline; filename="{filename}"'

        return response

    except Exception as err:
        logger.exception("Erro ao gerar PDF de resultados.")
        raise Http404("Não foi possível gerar o documento.") from err


# =========================================================
# PDF INSTITUCIONAL — REQUISIÇÃO
# =========================================================


def request_pdf(request, request_id):
    """Gera o PDF de uma requisição laboratorial pelo ID interno."""
    try:
        request = get_object_or_404(
            LabRequest.objects.select_related("patient"),
            id=request_id,
        )

        pdf_bytes, filename = generate_request_pdf(request)

        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response

    except Exception as err:
        logger.exception("Falha ao gerar PDF da requisição.")
        raise Http404("Não foi possível gerar o documento.") from err


# =========================================================
# PDF INSTITUCIONAL — RESULTADOS
# =========================================================


def results_pdf(request, request_id):
    """Gera o PDF de resultados validados para uma requisição laboratorial."""
    try:
        request = get_object_or_404(
            LabRequest.objects.select_related("patient"),
            id=request_id,
        )

        pdf_bytes, filename = generate_results_pdf(
            request,
            apenas_validados=True,
        )

        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response

    except Exception as err:
        logger.exception("Falha ao gerar PDF de resultados.")
        raise Http404("Não foi possível gerar o documento.") from err


# =========================================================
# PDF FATURA A PARTIR DA REQUISIÇÃO
# =========================================================


@staff_member_required
def request_invoice_pdf(request, custom_id):
    """Gera PDF de fatura a partir do `custom_id` da requisição."""
    try:
        request = (
            LabRequest.objects.select_related("patient", "analyst")
            .prefetch_related("exams")
            .get(custom_id=custom_id)
        )
    except LabRequest.DoesNotExist:
        raise Http404("Requisição não encontrada") from None
    except Exception as err:
        logger.exception("Erro ao buscar requisição para invoice.")
        raise Http404("Erro interno.") from err

    try:
        pdf_content, filename = generate_invoice_pdf(request)

        response = HttpResponse(pdf_content, content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        return response

    except Exception as err:
        logger.exception("Erro ao gerar PDF da invoice por requisição.")
        raise Http404("Erro ao gerar documento.") from err


# =========================================================
# PDF FATURA DIRETA
# =========================================================


@staff_member_required
def invoice_pdf(request, invoice_custom_id):
    """Gera PDF de fatura diretamente a partir do `custom_id` da fatura."""
    try:
        invoice = get_object_or_404(
            Invoice.objects.select_related("patient", "request"),
            custom_id=invoice_custom_id,
        )

        # garante consistência financeira
        if hasattr(invoice, "recalcular_totais"):
            invoice.recalcular_totais(save=True)

        pdf_content, filename = generate_invoice_pdf(invoice, request=request)

        response = HttpResponse(pdf_content, content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        return response

    except Exception as err:
        logger.exception("Erro ao gerar PDF da invoice.")
        raise Http404("Não foi possível gerar o documento.") from err


result_pdf = result_pdf
pdf_request = request_pdf
pdf_resultados = results_pdf
invoice_request_pdf = request_invoice_pdf
invoice_pdf = invoice_pdf
