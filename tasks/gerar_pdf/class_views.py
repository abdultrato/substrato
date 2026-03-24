from django.http import Http404
from django.shortcuts import get_object_or_404
from django.views import View

from apps.clinical.models.lab_request import LabRequest

from .views import pdf_requisicao, pdf_resultados


class RequisicaoPdf(View):
    def get(self, request, pk: int):
        try:
            requisicao = get_object_or_404(LabRequest.objects.select_related("paciente"), pk=pk)
        except Exception as exc:
            raise Http404("Requisição não encontrada") from exc

        return pdf_requisicao(request, requisicao_id=requisicao.id)


class ResultadoPdf(View):
    def get(self, request, pk: int):
        try:
            requisicao = get_object_or_404(LabRequest.objects.select_related("paciente"), pk=pk)
        except Exception as exc:
            raise Http404("Requisição não encontrada") from exc

        return pdf_resultados(request, requisicao_id=requisicao.id)
