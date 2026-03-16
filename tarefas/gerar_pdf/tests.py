from django.http import HttpRequest

from tarefas.gerar_pdf.views import pdf_requisicao


def test_pdf_requisicao_404(db):
    request = HttpRequest()
    try:
        pdf_requisicao(request, requisicao_id=99999)
    except Exception as exc:
        # Expect Http404
        assert exc.__class__.__name__ == "Http404"
    else:
        raise AssertionError("Expected Http404 for missing requisicao")
