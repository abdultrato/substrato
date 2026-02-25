import io
import logging

from django.contrib.admin.views.decorators import staff_member_required
from django.http import Http404, HttpResponse
from django.shortcuts import get_object_or_404
from reportlab.pdfgen import canvas
from rest_framework.views import APIView

from .models import Fatura, ResultadoItem
from .models.requisicao_analise import RequisicaoAnalise
from .utils.pdf_generator_fatura import gerar_pdf_fatura
from .utils.pdf_generator_requisicao import gerar_pdf_requisicao
from .utils.pdf_generator_resultado import gerar_pdf_resultados

logger = logging.getLogger("pdf.views")

# =========================================================
# PDFs SIMPLES (DEBUG / TESTE)
# =========================================================


class RequisicaoPdf(APIView):
    def get(self, request, pk):
        try:
            requisicao = get_object_or_404(RequisicaoAnalise, pk=pk)

            buffer = io.BytesIO()
            pdf = canvas.Canvas(buffer)

            pdf.drawString(100, 750, f"Requisição ID: {requisicao.id}")
            pdf.drawString(100, 730, f"Paciente: {requisicao.paciente.nome}")

            pdf.showPage()
            pdf.save()

            buffer.seek(0)
            return HttpResponse(buffer, content_type="application/pdf")

        except Exception as err:
            logger.exception("Erro ao gerar PDF simples de requisição.")
            raise Http404("Erro ao gerar PDF") from err


class ResultadoPdf(APIView):
    def get(self, request, pk):
        try:
            resultado = get_object_or_404(ResultadoItem, pk=pk)

            buffer = io.BytesIO()
            pdf = canvas.Canvas(buffer)

            pdf.drawString(100, 750, f"Resultado ID: {resultado.id}")
            pdf.drawString(100, 730, f"Paciente: {resultado.paciente.nome}")

            pdf.showPage()
            pdf.save()

            buffer.seek(0)
            return HttpResponse(buffer, content_type="application/pdf")

        except Exception as err:
            logger.exception("Erro ao gerar PDF simples de resultado.")
            raise Http404("Erro ao gerar PDF") from err


# =========================================================
# PDF INSTITUCIONAL — REQUISIÇÃO
# =========================================================


def pdf_requisicao(request, requisicao_id):
    try:
        requisicao = get_object_or_404(
            RequisicaoAnalise.objects.select_related("paciente"),
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
            RequisicaoAnalise.objects.select_related("paciente"),
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
            RequisicaoAnalise.objects.select_related("paciente", "analista")
            .prefetch_related("exames")
            .get(id_custom=id_custom)
        )
    except RequisicaoAnalise.DoesNotExist:
        raise Http404("Requisição não encontrada")
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
            Fatura.objects.select_related("paciente", "requisicao", "seguradora"),
            id_custom=fatura_id_custom,
        )

        # garante consistência financeira
        fatura.recalcular_totais(save=True)

        pdf_content, filename = gerar_pdf_fatura(fatura, request=request)

        response = HttpResponse(pdf_content, content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        return response

    except Exception as err:
        logger.exception("Erro ao gerar PDF da fatura.")
        raise Http404("Não foi possível gerar o documento.") from err
