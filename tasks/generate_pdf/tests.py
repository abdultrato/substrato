from django.http import HttpRequest

from tasks.generate_pdf.views import request_pdf


def test_request_pdf_404(db):
    request = HttpRequest()
    try:
        request_pdf(request, request_id=99999)
    except Exception as exc:
        # Expect Http404
        assert exc.__class__.__name__ == "Http404"
    else:
        raise AssertionError("Expected Http404 for missing request")
