"""Views baseadas em classe para emissão de PDFs clínicos."""

from django.http import Http404
from django.shortcuts import get_object_or_404
from django.views import View

from apps.clinical.models.lab_request import LabRequest

from .views import request_pdf, results_pdf


class RequestPdfView(View):
    """Expõe o PDF da requisição laboratorial a partir do `pk`."""

    def get(self, request, pk: int):
        """Resolve a requisição e delega para a view funcional de PDF."""
        try:
            request = get_object_or_404(LabRequest.objects.select_related("patient"), pk=pk)
        except Exception as exc:
            raise Http404("Requisição não encontrada") from exc

        return request_pdf(request, request_id=request.id)


class ResultPdfView(View):
    """Expõe o PDF de resultados laboratoriais a partir do `pk`."""

    def get(self, request, pk: int):
        """Resolve a requisição e delega para a view funcional de resultados."""
        try:
            request = get_object_or_404(LabRequest.objects.select_related("patient"), pk=pk)
        except Exception as exc:
            raise Http404("Requisição não encontrada") from exc

        return results_pdf(request, request_id=request.id)


RequisicaoPdf = RequestPdfView
ResultadoPdf = ResultPdfView
