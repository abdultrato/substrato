import logging

from django.contrib.admin.views.decorators import staff_member_required
from django.http import Http404, HttpResponse
from django.shortcuts import get_object_or_404

from apps.clinical.models.lab_request import LabRequest
from apps.billing.models.invoice import Invoice

from .invoice_pdf_generator import generate_invoice_pdf
from .request_pdf_generator import generate_request_pdf
from .result_pdf_generator import generate_results_pdf

logger = logging.getLogger("pdf.views")


@staff_member_required
def result_pdf(request, id_custom):
    """
    Gera o PDF institucional de resultados laboratoriais.
    """

    try:
        requisicao = get_object_or_404(
            LabRequest.objects.select_related(
                "paciente",
                "analista",
            ).prefetch_related(
                "resultado__itens__exame_campo__exame",
            ),
            id_custom=id_custom,
        )

        pdf_bytes, filename = generate_results_pdf(
            requisicao,
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


def request_pdf(request, requisicao_id):
    try:
        requisicao = get_object_or_404(
            LabRequest.objects.select_related("paciente"),
            id=requisicao_id,
        )

        pdf_bytes, filename = generate_request_pdf(requisicao)

        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response

    except Exception as err:
        logger.exception("Falha ao gerar PDF da requisição.")
        raise Http404("Não foi possível gerar o documento.") from err


# =========================================================
# PDF INSTITUCIONAL — RESULTADOS
# =========================================================


def results_pdf(request, requisicao_id):
    try:
        requisicao = get_object_or_404(
            LabRequest.objects.select_related("paciente"),
            id=requisicao_id,
        )

        pdf_bytes, filename = generate_results_pdf(
            requisicao,
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
def request_invoice_pdf(request, id_custom):
    try:
        requisicao = (
            LabRequest.objects.select_related("paciente", "analista")
            .prefetch_related("exames")
            .get(id_custom=id_custom)
        )
    except LabRequest.DoesNotExist:
        raise Http404("Requisição não encontrada") from None
    except Exception as err:
        logger.exception("Erro ao buscar requisição para fatura.")
        raise Http404("Erro interno.") from err

    try:
        pdf_content, filename = generate_invoice_pdf(requisicao)

        response = HttpResponse(pdf_content, content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        return response

    except Exception as err:
        logger.exception("Erro ao gerar PDF da fatura por requisição.")
        raise Http404("Erro ao gerar documento.") from err


# =========================================================
# PDF FATURA DIRETA
# =========================================================


@staff_member_required
def invoice_pdf(request, fatura_id_custom):
    try:
        fatura = get_object_or_404(
            Invoice.objects.select_related("paciente", "requisicao"),
            id_custom=fatura_id_custom,
        )

        # garante consistência financeira
        if hasattr(fatura, "recalcular_totais"):
            fatura.recalcular_totais(save=True)

        pdf_content, filename = generate_invoice_pdf(fatura, request=request)

        response = HttpResponse(pdf_content, content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        return response

    except Exception as err:
        logger.exception("Erro ao gerar PDF da fatura.")
        raise Http404("Não foi possível gerar o documento.") from err


resultado_pdf = result_pdf
pdf_requisicao = request_pdf
pdf_resultados = results_pdf
fatura_requisicao_pdf = request_invoice_pdf
fatura_pdf = invoice_pdf
