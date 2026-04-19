from django.http import HttpResponse

from infrastructure.middleware.admin_path_alias import AdminPathAliasMiddleware


def _run_middleware(path: str) -> str:
    captured = {"path": None}

    def get_response(request):
        captured["path"] = request.path_info
        return HttpResponse("ok")

    middleware = AdminPathAliasMiddleware(get_response)

    class DummyRequest:
        def __init__(self, p):
            self.path_info = p
            self.path = p
            self.META = {"PATH_INFO": p}
            self.headers = {}

    request = DummyRequest(path)
    middleware(request)
    return captured["path"]


def test_admin_pt_model_slug_is_rewritten_to_real_django_model_name():
    rewritten = _run_middleware("/admin/farmacia/movimentoestoque/")
    assert rewritten == "/admin/farmacia/inventorymovement/"


def test_admin_en_slug_keeps_working_for_frontend_shortcuts():
    rewritten = _run_middleware("/admin/pharmacy/lot/")
    assert rewritten == "/admin/farmacia/lot/"

