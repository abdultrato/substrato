import logging

from django.contrib.admin.views.decorators import staff_member_required
from django.http import Http404, HttpResponse
from django.shortcuts import get_object_or_404

from apps.clinical.models.lab_request import LabRequest
from apps.billing.models.invoice import Invoice

from .pdf_generator_fatura import gerar_pdf_fatura
from .pdf_generator_requisicao import gerar_pdf_requisicao
from .pdf_generator_resultado import gerar_pdf_resultados

logger = logging.getLogger("pdf.views")


@staff_member_required
def resultado_pdf(request, id_custom):
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

        pdf_bytes, filename = gerar_pdf_resultados(
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


def pdf_requisicao(request, requisicao_id):
    try:
        requisicao = get_object_or_404(
            LabRequest.objects.select_related("paciente"),
            id=requisicao_id,
        )

        pdf_bytes, filename = gerar_pdf_requisicao(requisicao)

        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response

    except Exception as err:
        logger.exception("Falha ao gerar PDF da requisição.")
        raise Http404("Não foi possível gerar o documento.") from err


# =========================================================
# PDF INSTITUCIONAL — RESULTADOS
# =========================================================


def pdf_resultados(request, requisicao_id):
    try:
        requisicao = get_object_or_404(
            LabRequest.objects.select_related("paciente"),
            id=requisicao_id,
        )

        pdf_bytes, filename = gerar_pdf_resultados(
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
def fatura_requisicao_pdf(request, id_custom):
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
        pdf_content, filename = gerar_pdf_fatura(requisicao)

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
def fatura_pdf(request, fatura_id_custom):
    try:
        fatura = get_object_or_404(
            Invoice.objects.select_related("paciente", "requisicao"),
            id_custom=fatura_id_custom,
        )

        # garante consistência financeira
        if hasattr(fatura, "recalcular_totais"):
            fatura.recalcular_totais(save=True)

        pdf_content, filename = gerar_pdf_fatura(fatura, request=request)

        response = HttpResponse(pdf_content, content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        return response

    except Exception as err:
        logger.exception("Erro ao gerar PDF da fatura.")
        raise Http404("Não foi possível gerar o documento.") from err
