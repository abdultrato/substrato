from django.http import Http404
from django.shortcuts import get_object_or_404
from django.views import View

from apps.clinical.models.lab_request import LabRequest

from .views import request_pdf, results_pdf


class RequestPdfView(View):
    def get(self, request, pk: int):
        try:
            requisicao = get_object_or_404(LabRequest.objects.select_related("paciente"), pk=pk)
        except Exception as exc:
            raise Http404("Requisição não encontrada") from exc

        return request_pdf(request, requisicao_id=requisicao.id)


class ResultPdfView(View):
    def get(self, request, pk: int):
        try:
            requisicao = get_object_or_404(LabRequest.objects.select_related("paciente"), pk=pk)
        except Exception as exc:
            raise Http404("Requisição não encontrada") from exc

        return results_pdf(request, requisicao_id=requisicao.id)


RequisicaoPdf = RequestPdfView
ResultadoPdf = ResultPdfView
